const Caver = require('caver-js');
const fs = require('fs');
const assert = require('assert');

const conf = JSON.parse(fs.readFileSync('transfer_conf.json', 'utf8'));
const bridgeAbi = JSON.parse(fs.readFileSync('../build/Bridge.abi', 'utf8'));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async function TokenTransfer() {
  const testcase = process.argv[1].substring(process.argv[1].lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
  console.log(`------------------------- ${testcase} START -------------------------`)
  const scnCaver = new Caver(conf.child.urls[0]);
  const scnInstanceBridge = new scnCaver.klay.Contract(bridgeAbi, conf.child.bridge);
  conf.child.sender = scnCaver.klay.accounts.wallet.add(conf.child.key).address;

  const enCaver = new Caver(conf.parent.urls[0]);
  const enInstanceBridge = new enCaver.klay.Contract(bridgeAbi, conf.parent.bridge);
  conf.parent.sender = enCaver.klay.accounts.wallet.add(conf.parent.key).address;

  const aliceOfMain = "0xc40b6909eb7085590e1c26cb3becc25368e24958";
  const bobOfSub = "0xc40b6909eb7085590e1c26cb3becc25368e24958";

  try {
    const amountTobeSent = enCaver.utils.convertToPeb('1', 'KLAY');
    const initialAmount = enCaver.utils.toPeb(1000, 'KLAY');

    const senderBalance = await enCaver.utils.convertFromPeb(await enCaver.rpc.klay.getBalance(conf.parent.sender));
    assert(senderBalance >= initialAmount);

    // Send KLAY from the sender on parent chain to bridge contract on the parent chain
    await enInstanceBridge.methods.chargeWithoutEvent().send({from: conf.parent.sender, gas: 100000000, value: initialAmount});

    // Send 1 KLAY from child chain to parent chain
    console.log("Send 1 KLAY from child chain to parent chain");
    await scnInstanceBridge.methods.requestKLAYTransfer(aliceOfMain, amountTobeSent, []).send({from: conf.child.sender,gas: 100000000, value: amountTobeSent});
    // Wait event to be trasnferred to child chain and contained into new block
    await sleep(6000);

    // Send 1 KLAY from parent chain to child chain
    console.log('Send 1 KLAY from parent chain to child chain');
    await enInstanceBridge.methods.requestKLAYTransfer(bobOfSub, amountTobeSent, []).send({from: conf.parent.sender,gas: 100000000, value: amountTobeSent});
    // Wait event to be trasnferred to child chain and contained into new block
    await sleep(2000);

    // Check alice's balance in both Parent Chain and Child Chain
    let balanceOfAliceOfMain = await enCaver.utils.convertFromPeb(await enCaver.rpc.klay.getBalance(aliceOfMain));
    let balanceOfBobOfSub = await scnCaver.utils.convertFromPeb(await scnCaver.rpc.klay.getBalance(bobOfSub));
    let balanceOfMainBridge = await enCaver.utils.convertFromPeb(await enCaver.rpc.klay.getBalance(conf.parent.bridge));
    let balanceOfSubBridge = await scnCaver.utils.convertFromPeb(await scnCaver.rpc.klay.getBalance(conf.child.bridge));
    console.log(`Alice's balance in the parentchain         :`, balanceOfAliceOfMain);
    console.log(`  Bob's balance in the childchain          :`, balanceOfBobOfSub);
    console.log(`Parent bridge's balance in the paretnchain :`, balanceOfMainBridge);
    console.log(`Child bridge's balance in the childchain   :`, balanceOfSubBridge);
    console.log(`------------------------- ${testcase} END -------------------------`)
  } catch (e) {
    console.log("Error:", e);
  }
})()
