const Caver = require('caver-js');
const fs = require('fs');

const conf = JSON.parse(fs.readFileSync('transfer_conf.json', 'utf8'));
const bridgeAbi = JSON.parse(fs.readFileSync('../build/Bridge.abi', 'utf8'));
const tokenAbi = JSON.parse(fs.readFileSync('../build/ServiceChainToken.abi', 'utf8'));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async function TokenTransfer() {
  const testcase = process.argv[1].substring(process.argv[1].lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
  console.log(`------------------------- ${testcase} START -------------------------`)
  const scnCaver = new Caver(`http://${conf.child.ip}:${conf.child.port}`);
  const scnInstance = new scnCaver.klay.Contract(tokenAbi, conf.child.token);
  const scnInstanceBridge = new scnCaver.klay.Contract(bridgeAbi, conf.child.bridge);

  const enCaver = new Caver(`http://${conf.parent.ip}:${conf.parent.port}`);
  const enInstance = new enCaver.klay.Contract(tokenAbi, conf.parent.token);
  const enInstanceBridge = new enCaver.klay.Contract(bridgeAbi, conf.parent.bridge);

  conf.child.sender = scnCaver.klay.accounts.wallet.add(conf.child.key).address;
  conf.parent.sender = enCaver.klay.accounts.wallet.add(conf.parent.key).address;
  const alice = "0xc40b6909eb7085590e1c26cb3becc25368e249e9";

  try {
    let balance = await scnInstance.methods.balanceOf(alice).call();
    console.log("alice balance:", balance);

    // Transfer main chain to service chain
    console.log("requestValueTransfer..")
    let amount = 100;
    await enInstance.methods.approve(conf.parent.bridge, amount).send({from:conf.parent.sender, to: conf.parent.token, gas: 1000000})
    await enInstanceBridge.methods.requestERC20Transfer(conf.parent.token, alice, amount, 0, []).send({from:conf.parent.sender, gas: 1000000})
    // Wait event to be trasnferred to child chain and contained into new block
    await sleep(6000);

    // Check alice balance in Service Chain
    balance = await scnInstance.methods.balanceOf(alice).call();
    console.log("alice balance:", balance);
    console.log(`------------------------- ${testcase} END -------------------------`)
  } catch (e) {
    console.log("Error:", e);
  }
})()
