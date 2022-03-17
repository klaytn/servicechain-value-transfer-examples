const Caver = require('caver-js');
const axios = require('axios');
const fs = require('fs')
const util = require('util');
const assert = require('assert');

const conf = JSON.parse(fs.readFileSync('../common/bridge_info.json', 'utf8'));

const bridgeAbi = JSON.parse(fs.readFileSync('../build/Bridge.abi', 'utf8'));
const bridgeCode = fs.readFileSync('../build/Bridge.bin', 'utf8');

async function jsonRpcReq(url, log, method, params) {
  if (typeof jsonRpcReq.id == 'undefined') jsonRpcReq.id = 0;

  console.log(log)
  await axios.post(url, {
      "jsonrpc":"2.0","method":method,"params":params,"id": jsonRpcReq.id++
  }).then(res => {
  }).catch(err => {
    console.log(res.data.error)
  })
}

async function deploy(info, bridgeIdentity) {
  const caver = new Caver(info.url);
  info.sender = caver.klay.accounts.wallet.add(info.key).address;

  try {
    // Send intial 1000 KLAY to ServiceChain bridge contract, not parent bridge contract
    // Sending the initial KLAY for parent bridge contract (e.g., baobab, cypress, or your another ServiceChain) is handled at the time of sending KLAY from ServiceChain to Parent chain ('klay-transfer.js')
    // Check the balance first before sending 1000 KLAY to bridge contract
    let amount = 0;
    if (bridgeIdentity == "child") {
      amount = caver.utils.toPeb(1000, 'KLAY');
      const senderBalance = await caver.utils.convertFromPeb(await caver.rpc.klay.getBalance(info.sender));
      assert(senderBalance >= amount);
      console.log("sender blaance:", senderBalance);
    }

    // Deploy bridge
    const instanceBridge = new caver.klay.Contract(bridgeAbi);
    info.newInstanceBridge = await instanceBridge.deploy({data: bridgeCode, arguments:[true]})
        .send({ from: info.sender, gas: 100000000, value: amount });
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
  await deploy(conf.child, 'child');
  await deploy(conf.parent, 'parent');

  // register operator
  await conf.child.newInstanceBridge.methods.registerOperator(conf.child.operator).send({ from: conf.child.sender, gas: 100000000, value: 0 });
  await conf.parent.newInstanceBridge.methods.registerOperator(conf.parent.operator).send({ from: conf.parent.sender, gas: 100000000, value: 0 });

  // transferOwnership
  await conf.child.newInstanceBridge.methods.transferOwnership(conf.child.operator).send({ from: conf.child.sender, gas: 100000000, value: 0 });
  await conf.parent.newInstanceBridge.methods.transferOwnership(conf.parent.operator).send({ from: conf.parent.sender, gas: 100000000, value: 0 });

  const filename  = "transfer_conf.json"
  fs.writeFile(filename, JSON.stringify(conf), (err) => {
      if (err) {
          console.log("Error:", err);
      }
  })
  
  const url = conf.child.url;
  log = 'registering bridges to the child node'
  await jsonRpcReq(url, log, 'subbridge_registerBridge', [conf.child.bridge, conf.parent.bridge]);

  log = 'subscribing bridges to the child node'
  await jsonRpcReq(url, log, 'subbridge_subscribeBridge', [conf.child.bridge, conf.parent.bridge]);

/*
  console.log(`subbridge.registerBridge("${conf.child.bridge}", "${conf.parent.bridge}")`)
  console.log(`subbridge.subscribeBridge("${conf.child.bridge}", "${conf.parent.bridge}")`)
*/
  console.log(`------------------------- ${testcase} END -------------------------`)
})();
