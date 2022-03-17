// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const ENbridge = await hre.ethers.getContractFactory("Bridge");
  const enbridge = await ENbridge.deploy(false);
  await enbridge.deployed();

  const SCbridge = await hre.ethers.getContractFactory("Bridge");
  const scbridge = await SCbridge.deploy(false);
  await scbridge.deployed();

  const ENtoken = await hre.ethers.getContractFactory("ServiceChainToken");
  const entoken = await ENtoken.deploy(enbridge.address);
  await entoken.deployed(enbridge.address);

  const SCtoken = await hre.ethers.getContractFactory("ServiceChainToken");
  const sctoken = await SCtoken.deploy(enbridge.address);
  await sctoken.deployed(scbridge.address);

  await entoken.addMinter(enbridge.address);
  await sctoken.addMinter(scbridge.address);

  const signers = await hre.ethers.getSigners();
  const enop = signers[1].address;
  const scop = signers[2].address;
  console.log('EN operator:', enop);
  console.log('SCN operator:', scop);

  await enbridge.registerOperator(enop);
  await scbridge.registerOperator(scop);

  await enbridge.registerToken(entoken.address, sctoken.address);
  await scbridge.registerToken(sctoken.address, entoken.address);

  await enbridge.transferOwnership(enop);
  await scbridge.transferOwnership(scop);

  console.log(`subbridge.registerBridge("${scbridge.address}", "${enbridge.address}")`)
  console.log(`subbridge.subscribeBridge("${scbridge.address}", "${enbridge.address}")`)
  console.log(`subbridge.registerToken("${scbridge.address}", "${enbridge.address}", "${sctoken.address}", "${entoken.address}")`)

  const alice = '0xc40b6909eb7085590e1c26cb3becc25368e249e9';

  // request to the token contract
  await entoken.requestValueTransfer(100, alice, 0, []);

  // direct request to the bridge
  await entoken.approve(enbridge.address, 100);
  await enbridge.requestERC20Transfer(entoken.address, alice, 100, 0, []);
  console.log(await entoken.balanceOf(enbridge.address));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
