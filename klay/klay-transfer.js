const Caver = require('caver-js');
const fs = require('fs');

const conf = JSON.parse(fs.readFileSync('transfer_conf.json', 'utf8'));
const bridgeAbi = JSON.parse(fs.readFileSync('../build/Bridge.abi', 'utf8'));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async function TokenTransfer() {
  const testcase = process.argv[1].substring(process.argv[1].lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
  console.log(`------------------------- ${testcase} START -------------------------`)
  const scnCaver = new Caver(`http://${conf.child.ip}:${conf.child.port}`);
  const scnInstanceBridge = new scnCaver.klay.Contract(bridgeAbi, conf.child.bridge);
  conf.child.sender = scnCaver.klay.accounts.wallet.add(conf.child.key).address;

  const enCaver = new Caver(`http://${conf.parent.ip}:${conf.parent.port}`);
  const enInstanceBridge = new enCaver.klay.Contract(bridgeAbi, conf.parent.bridge);
  conf.parent.sender = enCaver.klay.accounts.wallet.add(conf.parent.key).address;

  //const alice = "0xc40b6909eb7085590e1c26cb3becc25368e249e1";
  const aliceOfMain = "0xc40b6909eb7085590e1c26cb3becc25368e24922";
  const aliceOfSub = "0xc40b6909eb7085590e1c26cb3becc25368e24921";

  try {
    const amount = enCaver.utils.convertToPeb('1', 'KLAY');

    // Send klay from SCN to EN
    console.log('Send 1 klay from Main to Sub');
    await enCaver.klay.sendTransaction({
      from: conf.parent.sender,
      to: conf.parent.bridge,
      value: amount,
      gas: 100000000,
    });

    await scnInstanceBridge.methods.requestKLAYTransfer(aliceOfMain, amount, []).send({from: conf.child.sender,gas: 100000000, value: amount })
    // Wait event to be trasnferred to child chain and contained into new block
    await sleep(6000);

    // Send klay from EN to SCN
    console.log('Send 1 klay from Sub to Main');
    await scnCaver.klay.sendTransaction({
      from: conf.child.sender,
      to: conf.child.bridge,
      value: amount,
      gas: 100000000,
    });
    await enInstanceBridge.methods.requestKLAYTransfer(aliceOfSub, amount, []).send({from: conf.parent.sender,gas: 100000000, value: amount })
    // Wait event to be trasnferred to child chain and contained into new block
    await sleep(6000);

    // Check alice's balance in both Parent Chain and Child Chain
    let balanceOfAliceOfMain = await enCaver.utils.convertFromPeb(await enCaver.rpc.klay.getBalance(aliceOfMain));
    let balanceOfAliceOfSub = await scnCaver.utils.convertFromPeb(await scnCaver.rpc.klay.getBalance(aliceOfSub));
    console.log('By Klay:(', balanceOfAliceOfMain, '), By Peb:(', await enCaver.rpc.klay.getBalance(aliceOfMain),')');
    console.log('By Klay:(', balanceOfAliceOfSub, '), By Peb:(', await scnCaver.rpc.klay.getBalance(aliceOfSub),')');
    console.log(`------------------------- ${testcase} END -------------------------`)
  } catch (e) {
    console.log("Error:", e);
  }
})()
