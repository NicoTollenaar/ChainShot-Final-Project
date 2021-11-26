const { ethers } = require("hardhat");

async function main() {
  
  const chainAccountFactory = await ethers.getContractFactory("ChainAccount");
  const chainAccountContract = await chainAccountFactory.deploy();
  await chainAccountContract.deployed();

  const chainAccountDeployer = await chainAccountContract.signer;
  const chainAccountContractAddress = chainAccountContract.address;

  console.log("chainAccountContract deployed to address:", chainAccountContractAddress);
  console.log("This is the address of the deployer: ", chainAccountDeployer.address);

  const bankSigner = await ethers.getSigner(0); // bank is deployer
  const depositorSigner = await ethers.getSigner(1);
  const beneficiarySigner = await ethers.getSigner(2); 
  const arbiterSigner = await ethers.getSigner(3);
  const escrowAmount = 1000;
  console.log ("bank: ", bankSigner.address);
  console.log ("depositor: ", depositorSigner.address);
  console.log ("beneficiary: ", beneficiarySigner.address);
  console.log ("arbiter: ", arbiterSigner.address);
  console.log(`Escrow amount: ${escrowAmount}`);

  const escrowFactory = await ethers.getContractFactory("EscrowContract", bankSigner); 
  const escrowContract = await escrowFactory.deploy(chainAccountContractAddress);
  await escrowContract.deployed();

  const escrowDeployer = await escrowContract.signer;

  console.log("escrowContract deployed to address:", escrowContract.address);
  console.log("Escrow deployer: ", escrowDeployer.address);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
