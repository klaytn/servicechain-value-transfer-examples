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
      console.log("HERE22")
      console.log(err);
      process.exit(1);
    }
  });
}

async function makeInstance(info) {
  const caver = new Caver(info.url);
  info.sender = caver.klay.accounts.wallet.add(info.key).address;

  try {
      // Bridge instance
      const instanceBridge = new caver.klay.Contract(bridgeAbi);

      // ERC20 token instance
      const instance = new caver.klay.Contract(tokenAbi);
  } catch (e) {
      console.log("Error:", e);
  }
}

(async function TokenDeploy() {
  const testcase = process.argv[1].substring(process.argv[1].lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
  console.log(`------------------------- ${testcase} START -------------------------`)
  await makeInstance(conf.child);
  await makeInstance(conf.parent);

  // register operator
  await conf.child.newInstanceBridge.methods.registerOperator("your new child operator").send({ from: conf.child.sender, gas: 100000000, value: 0 });
  await conf.parent.newInstanceBridge.methods.registerOperator("your new parent operator").send({ from: conf.parent.sender, gas: 100000000, value: 0 });

  console.log(`------------------------- ${testcase} END -------------------------`)
})();
