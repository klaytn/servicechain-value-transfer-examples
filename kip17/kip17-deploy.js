const Caver = require('caver-js');
const axios = require('axios');
const fs = require('fs')
const util = require('util');

const conf = JSON.parse(fs.readFileSync('../common/bridge_info.json', 'utf8'));

const bridgeAbi = JSON.parse(fs.readFileSync('../build/Bridge.abi', 'utf8'));
const bridgeCode = fs.readFileSync('../build/Bridge.bin', 'utf8');
const nftAbi = JSON.parse(fs.readFileSync('../build/ServiceChainTokenKIP17.abi', 'utf8'));
const nftCode = fs.readFileSync('../build/ServiceChainTokenKIP17.bin', 'utf8');

async function jsonRpcReq(url, log, method, params) {
    if (typeof jsonRpcReq.id == 'undefined') jsonRpcReq.id = 0;

    console.log(log)
    await axios.post(url, {
        "jsonrpc":"2.0","method":method,"params":params,"id": jsonRpcReq.id++
    }).then(res => {
    }).catch(err => {
      //console.log(res.data.error)
    })
}

async function deploy(info) {
  const caver = new Caver(info.url);
  info.sender = caver.klay.accounts.wallet.add(info.key).address;

  try {
      // Deploy bridge
      const instanceBridge = new caver.klay.Contract(bridgeAbi);
      info.newInstanceBridge = await instanceBridge.deploy({data: bridgeCode, arguments:[true]})
          .send({ from: info.sender, gas: 100000000, value: 0 });
      info.bridge = info.newInstanceBridge._address;
      console.log(`info.bridge: ${info.bridge}`);

      // Deploy KIP17 token
      const instance = new caver.klay.Contract(nftAbi);
      info.newInstance = await instance.deploy({data: nftCode, arguments:[info.newInstanceBridge._address]})
          .send({ from: info.sender, gas: 100000000, value: 0 });
      info.token = info.newInstance._address;
      console.log(`info.token: ${info.token}`);
  } catch (e) {
      console.log("Error:", e);
  }
}

(async function TokenDeploy() {
  const testcase = process.argv[1].substring(process.argv[1].lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
  console.log(`------------------------- ${testcase} START -------------------------`)
  await deploy(conf.child);
  await deploy(conf.parent);

  // add minter
  await conf.child.newInstance.methods.addMinter(conf.child.bridge).send({ from: conf.child.sender, to: conf.child.bridge, gas: 100000000, value: 0 });
  await conf.parent.newInstance.methods.addMinter(conf.parent.bridge).send({ from: conf.parent.sender, to: conf.child.bridge, gas: 100000000, value: 0 });

  // register operator
  await conf.child.newInstanceBridge.methods.registerOperator(conf.child.operator).send({ from: conf.child.sender, gas: 100000000, value: 0 });
  await conf.parent.newInstanceBridge.methods.registerOperator(conf.parent.operator).send({ from: conf.parent.sender, gas: 100000000, value: 0 });

  // register token
  await conf.child.newInstanceBridge.methods.registerToken(conf.child.token, conf.parent.token).send({ from: conf.child.sender, gas: 100000000, value: 0 });
  await conf.parent.newInstanceBridge.methods.registerToken(conf.parent.token, conf.child.token).send({ from: conf.parent.sender, gas: 100000000, value: 0 });

  // transferOwnership
  await conf.child.newInstanceBridge.methods.transferOwnership(conf.child.operator).send({ from: conf.child.sender, gas: 100000000, value: 0 });
  await conf.parent.newInstanceBridge.methods.transferOwnership(conf.parent.operator).send({ from: conf.parent.sender, gas: 100000000, value: 0 });

  const filename  = "transfer_conf.json"
  fs.writeFile(filename, JSON.stringify(conf), (err) => {
      if (err) {
          console.log("Error:", err);
      }
  });

  const url = conf.child.url;
  log = 'registering bridges to the child node';
  await jsonRpcReq(url, log, 'subbridge_registerBridge', [conf.child.bridge, conf.parent.bridge]);

  log = 'subscribing bridges to the child node';
  await jsonRpcReq(url, log, 'subbridge_subscribeBridge', [conf.child.bridge, conf.parent.bridge]);

  log = 'register token to subbridge..';
  await jsonRpcReq(url, log, 'subbridge_registerToken', [conf.child.bridge, conf.parent.bridge, conf.child.token, conf.parent.token]);

  /*
   * Initialize service chain configuration with three logs via interaction with attached console
  console.log(`subbridge.registerBridge("${conf.child.bridge}", "${conf.parent.bridge}")`)
  console.log(`subbridge.subscribeBridge("${conf.child.bridge}", "${conf.parent.bridge}")`)
  console.log(`subbridge.registerToken("${conf.child.bridge}", "${conf.parent.bridge}", "${conf.child.token}", "${conf.parent.token}")`)
  */
  console.log(`------------------------- ${testcase} END -------------------------`)
})();
