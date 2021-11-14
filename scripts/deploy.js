
// const hre = require("hardhat");

const { ethers } = require("hardhat");

async function main() {
  
  const constractAddress = "0xEeddf2a05e546DdFe33FE3b86e6D4817f89c3Adb";
  const contractToDeploy = await ethers.getContractFactory("ABNAMROchainCheque", constractAddress);
  const chequeContract = await contractToDeploy.deploy();
  await chequeContract.deployed();

  const deployer = await chequeContract.signer;

  console.log("chequeContract deployed to address:", chequeContract.address);
  console.log("This is the address of the deployer: ", deployer.address);
  console.log("These are the keys of the chequeContract object: ", Object.keys(chequeContract));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
