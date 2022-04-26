const Caver = require('caver-js');
const assert = require('assert');
const fs = require('fs');

const conf = JSON.parse(fs.readFileSync('transfer_conf.json', 'utf8'));
const bridgeAbi = JSON.parse(fs.readFileSync('../build/Bridge.abi', 'utf8'));
const nftAbi = JSON.parse(fs.readFileSync('../build/ServiceChainNFT.abi', 'utf8'));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getFreshToken() {
  let tokenId;
  // find non-exist token.
  while (1) {
    tokenId = parseInt(Math.random() * 100000);
    try {
      const owner = await enInstance.methods.ownerOf(tokenId).call();
    } catch(err) {
      // The only revert reason is that the token does not exist.
      return tokenId;
    }
  }
}

(async function TokenTransfer() {
  const testcase = process.argv[1].substring(process.argv[1].lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
  console.log(`------------------------- ${testcase} START -------------------------`)
  const scnCaver = new Caver(conf.child.url);
  const scnInstance = new scnCaver.klay.Contract(nftAbi, conf.child.token);
  const scnInstanceBridge = new scnCaver.klay.Contract(bridgeAbi, conf.child.bridge);

  const enCaver = new Caver(conf.parent.url);
  const enInstance = new enCaver.klay.Contract(nftAbi, conf.parent.token);
  const enInstanceBridge = new enCaver.klay.Contract(bridgeAbi, conf.parent.bridge);

  conf.child.sender = scnCaver.klay.accounts.wallet.add(conf.child.key).address;
  conf.parent.sender = enCaver.klay.accounts.wallet.add(conf.parent.key).address;
  const alice = "0xc40b6909eb7085590e1c26cb3becc25368e249e9";

  try {
    const tokenURI = "https://www.klaytn.com";
    const tokenId = await getFreshToken();
    console.log(`tokenId: ${tokenId}`);

    // Mint a token
    await enInstance.methods.mintWithTokenURI(conf.parent.sender, tokenId, tokenURI).send({from: conf.parent.sender, gas:1000000});
    let owner = await enInstance.methods.ownerOf(tokenId).call();
    console.log(`Current owner: ${owner}`);

    console.log(`Transfer the tokenId (${tokenId}) to ${alice}`);
    // Transfer main chain to service chain
    await enInstance.methods.approve(conf.parent.bridge, tokenId).send({from:conf.parent.sender, gas: 1000000})
    await enInstanceBridge.methods.requestERC721Transfer(conf.parent.token, alice, tokenId, []).send({from:conf.parent.sender, gas: 1000000})
    // Wait event to be trasnferred to child chain and contained into new block
    await sleep(6000)

    let newOwner = await scnInstance.methods.ownerOf(tokenId).call();
    assert(alice == newOwner.toLowerCase());
    console.log(`Owner: ${newOwner}`);
    console.log(`------------------------- ${testcase} END -------------------------`)
  } catch (e) {
    console.log("Error:", e);
  }
})()
