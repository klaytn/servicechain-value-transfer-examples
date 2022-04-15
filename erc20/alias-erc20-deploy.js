const Caver = require('caver-js');
const axios = require('axios');
const fs = require('fs')
const util = require('util');

const conf = JSON.parse(fs.readFileSync('../common/bridge_info.json', 'utf8'));

const bridgeAbi = JSON.parse(fs.readFileSync('../build/Bridge.abi', 'utf8'));
const bridgeCode = fs.readFileSync('../build/Bridge.bin', 'utf8');
const tokenAbi = JSON.parse(fs.readFileSync('../build/ServiceChainToken.abi', 'utf8'));
const tokenCode = fs.readFileSync('../build/ServiceChainToken.bin', 'utf8');

async function jsonRpcReq(url, log, method, params) {
  if (typeof jsonRpcReq.id == undefined) jsonRpcReq.id = 0;

  console.log(log)
  await axios.post(url, {
      "jsonrpc":"2.0","method":method,"params":params,"id": jsonRpcReq.id++
  }).then(res => {
    if (res.data.error != undefined) {
      console.log(res.data.error);
      process.exit(res.data.code);
    }
  }).catch(err => {
    if (err != undefined) {
      console.log(err);
      process.exit(1);
    }
  });
}
async function deploy(url, sender, info) {
  const caver = new Caver(url);
  sender.address = caver.klay.accounts.wallet.add(sender.key).address;

  try {
      // Deploy bridge
      const instanceBridge = new caver.klay.Contract(bridgeAbi);
      info.newInstanceBridge = await instanceBridge.deploy({data: bridgeCode, arguments:[true]})
          .send({ from: sender.address, gas: 100000000, value: 0 });
      info.bridge = info.newInstanceBridge._address;
      console.log(`info.bridge: ${info.bridge}`);

      // Deploy ERC20 token
      const instance = new caver.klay.Contract(tokenAbi);
      info.newInstance = await instance.deploy({data: tokenCode, arguments:[info.newInstanceBridge._address]})
          .send({ from: sender.address, gas: 100000002, value: 0 });
      info.token = info.newInstance._address;
      console.log(`info.token: ${info.token}`);
  } catch (e) {
      console.log("Error:", e);
  }
}

(async function TokenDeploy() {
  const testcase = process.argv[1].substring(process.argv[1].lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
  console.log(`------------------------- ${testcase} START -------------------------`)
  conf.contract = {child: {}, parent:{}}
  await deploy(conf.url.children[0], conf.sender.child, conf.contract.child);
  await deploy(conf.url.parent, conf.sender.parent, conf.contract.parent);

  // add minter
  await conf.contract.child.newInstance.methods.addMinter(conf.contract.child.bridge).send({ from: conf.sender.child.address, to: conf.contract.child.bridge, gas: 100000000, value: 0 });
  await conf.contract.parent.newInstance.methods.addMinter(conf.contract.parent.bridge).send({ from: conf.sender.parent.address, to: conf.contract.parent.bridge, gas: 100000000, value: 0 });

  // register token
  await conf.contract.child.newInstanceBridge.methods.registerToken(conf.contract.child.token, conf.contract.parent.token).send({ from: conf.sender.child.address, gas: 100000000, value: 0 });
  await conf.contract.parent.newInstanceBridge.methods.registerToken(conf.contract.parent.token, conf.contract.child.token).send({ from: conf.sender.parent.address, gas: 100000000, value: 0 });

  var firstParentOperator = "";
  var firstChildOperator = "";
  for (const url of conf.url.children) {
    log = 'querying parentOperator to the child node'
    const parentOperatorRes = await jsonRpcReq(url, log, 'subbridge_getParentOperatorAddr', []);
    log = 'querying childOperator to the child node'
    const childOperatorRes = await jsonRpcReq(url, log, 'subbridge_getChildOperatorAddr', []);
    const parentOperator = parentOperatorRes.data.result;
    const childOperator = childOperatorRes.data.result;
    if (firstParentOperator == "") {
      firstParentOperator = parentOperator;
      firstChildOperator = childOperator;
    }

    // register operator
    await conf.child.newInstanceBridge.methods.registerOperator(bridge.child.operator).send({ from: conf.sender.child.address, gas: 100000000, value: 0 });
    await conf.parent.newInstanceBridge.methods.registerOperator(bridge.parent.operator).send({ from: conf.sender.parent.address, gas: 100000000, value: 0 });

    const alias = "MYBRIDGE2"
    log = 'registering bridges to the child node'
    await jsonRpcReq(url, log, 'subbridge_registerBridgeByAlias', [alias, conf.contract.child.bridge, conf.contract.parent.bridge]);

    log = 'subscribing bridges to the child node'
    await jsonRpcReq(url, log, 'subbridge_subscribeBridgeByAlias', [alias]);

    log = 'register token to subbridge..'
    await jsonRpcReq(url, log, 'subbridge_registerTokenByAlias', [alias, conf.contract.child.token, conf.contract.parent.token]);
    /* Above 3 APIs can also be called via Klaytn Javascript Console.
     * > subbridge.registerBridgeByAlias("MYBRIDGE2", "0xCHILD_BRIDGE_ADDRESS", "0xPARENT_BRIDGE_ADDRESS")
     * > subbridge.subscribeBridgeByAlias("MYBRIDGE2", "0xCHILD_BRIDGE_ADDRESS", "0xPARENT_BRIDGE_ADDRESS")
     * > subbridge.registerTokenByAlias("MYBRIDGE2", "0xCHILD_BRIDGE_ADDRESS", "0xPARENT_BRIDGE_ADDRESS", "0xCHILD_TOKEN_ADDRESS", "0xPARENT_TOKEN_ADDRESS")
     */
  }

  // set operator threshold
  await conf.contract.child.newInstanceBridge.methods.setOperatorThreshold(0, conf.url.children.length).send({ from: conf.sender.child.address, gas: 100000000, value: 0 });
  await conf.contract.parent.newInstanceBridge.methods.setOperatorThreshold(0, conf.url.children.length).send({ from: conf.sender.parent.address, gas: 100000000, value: 0 });

  // transfer ownership to first operator
  await conf.contract.child.newInstanceBridge.methods.transferOwnership(firstChildOperator).send({ from: conf.sender.child.address, gas: 100000000, value: 0 });
  await conf.contract.parent.newInstanceBridge.methods.transferOwnership(firstParentOperator).send({ from: conf.sender.parent.address, gas: 100000000, value: 0 });

  const filename  = "transfer_conf.json"
  fs.writeFile(filename, JSON.stringify(conf), (err) => {
      if (err) {
          console.log("Error:", err);
      }
  })

  console.log(`------------------------- ${testcase} END -------------------------`)
})();
