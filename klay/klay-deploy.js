const Caver = require('caver-js');
const axios = require('axios');
const fs = require('fs')
const util = require('util');
const assert = require('assert');

const conf = JSON.parse(fs.readFileSync('../common/bridge_info.json', 'utf8'));

const bridgeAbi = JSON.parse(fs.readFileSync('../build/Bridge.abi', 'utf8'));
const bridgeCode = fs.readFileSync('../build/Bridge.bin', 'utf8');

async function jsonRpcReq(url, log, method, params) {
  if (typeof jsonRpcReq.id == undefined) jsonRpcReq.id = 0;

  console.log(log)
  return await axios.post(url, {
      "jsonrpc":"2.0","method":method,"params":params,"id": jsonRpcReq.id++
  }).then(res => {
    if (res.data.error != undefined) {
      console.log(res.data.error);
      process.exit(res.data.code);
    }
    return res;
  }).catch(err => {
    if (err != undefined) {
      console.log(err);
      process.exit(1);
    }
  });
}

async function deploy(url, sender, info, bridgeIdentity) {
  const caver = new Caver(url);
  sender.address = caver.klay.accounts.wallet.add(sender.key).address;

  try {
    // Send intial 1000 KLAY to ServiceChain bridge contract, not parent bridge contract
    // Sending the initial KLAY for parent bridge contract (e.g., baobab, cypress, or your another ServiceChain) is handled at the time of sending KLAY from ServiceChain to Parent chain ('klay-transfer.js')
    // Check the balance first before sending 1000 KLAY to bridge contract
    let amount = 0;
    if (bridgeIdentity == "child") {
      amount = caver.utils.toPeb(1000, 'KLAY');
      const senderBalance = await caver.utils.convertFromPeb(await caver.rpc.klay.getBalance(sender.address));
      assert(senderBalance >= amount);
      console.log("sender balance:", senderBalance);
    }

    // Deploy bridge
    const instanceBridge = new caver.klay.Contract(bridgeAbi);
    info.newInstanceBridge = await instanceBridge.deploy({data: bridgeCode, arguments:[true]})
        .send({ from: sender.address, gas: 100000000, value: amount });
    info.bridge = info.newInstanceBridge._address;
    const bridgeBalance = await caver.utils.convertFromPeb(await caver.rpc.klay.getBalance(info.bridge));
    if (bridgeIdentity == "child")
      console.log("Child bridge's blaance:", bridgeBalance);
    console.log(`info.bridge: ${info.bridge}`);
  } catch (e) {
      console.log("Error:", e);
  }
}

(async function TokenDeploy() {
  const testcase = process.argv[1].substring(process.argv[1].lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
  console.log(`------------------------- ${testcase} START -------------------------`)
  conf.contract = {child: {}, parent:{}}
  await deploy(conf.url.children[0], conf.sender.child, conf.contract.child, 'child');
  await deploy(conf.url.parent, conf.sender.parent, conf.contract.parent, 'parent');

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
    await conf.contract.child.newInstanceBridge.methods.registerOperator(childOperator).send({ from: conf.sender.child.address, gas: 100000000, value: 0 });
    await conf.contract.parent.newInstanceBridge.methods.registerOperator(parentOperator).send({ from: conf.sender.parent.address, gas: 100000000, value: 0 });

    log = 'registering bridges to the child node'
    await jsonRpcReq(url, log, 'subbridge_registerBridge', [conf.contract.child.bridge, conf.contract.parent.bridge]);

    log = 'subscribing bridges to the child node'
    await jsonRpcReq(url, log, 'subbridge_subscribeBridge', [conf.contract.child.bridge, conf.contract.parent.bridge]);
    /* Above 2 APIs can also be called via Klaytn Javascript Console.
     * > subbridge.registerBridge("0xCHILD_BRIDGE_ADDRESS", "0xPARENT_BRIDGE_ADDRESS")
     * > subbridge.subscribeBridge("0xCHILD_BRIDGE_ADDRESS", "0xPARENT_BRIDGE_ADDRESS")
     */
  }

  // set operator threshold
  // In this example, we set operator threshold to the number of bridge operators,
  // so all bridge must be operational in order for value transfer to succeed.
  // This is intended to check if all bridges are working fine.
  // In production, use an appropriate threshold to fit your needs.
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
