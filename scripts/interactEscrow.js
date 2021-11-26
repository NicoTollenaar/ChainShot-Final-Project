const { hre, ethers, network } = require("hardhat");
const fs = require('fs');
const { hrtime } = require("process");

// const { escrowContractAddress } = require('./config.json');
const { escrowContractAddress, chainAccountContractAddress } = JSON.parse(fs.readFileSync("./config.json"));
console.log("escrowContract address is: ", escrowContractAddress);
console.log("chainAccountContract address is: ", chainAccountContractAddress);

async function main() {
    const escrowAmount = 10000;
    const [ bankSigner, depositorSigner, beneficiarySigner, arbiterSigner ] = await ethers.getSigners();
    console.log(`Bank: ${bankSigner.address}\nDepositor: ${depositorSigner.address}
    \nBeneficiary: ${beneficiarySigner.address}\nArbiter: ${arbiterSigner.address}`);
    console.log("Transactions being mined, please wait ...");
    const chainAccountContract = await ethers.getContractAt("ChainAccount", chainAccountContractAddress);
    const escrowContract = await ethers.getContractAt("EscrowContract", escrowContractAddress);
    // const txMoveOnChain = await chainAccountContract.connect(bankSigner).moveFundsOnChain(depositorSigner.address, 10000);    await txMoveOnChain.wait();
    // await txMoveOnChain.wait();
   
    
escrowContract.on('ProposedEscrow', (escrow) => {
    console.log("Emitted event: new escrow has been proposed");
  });
  escrowContract.on('ConsentToEscrow', (address, escrow) => {
    console.log(`Emitted event: ${address} has consented to the proposed Escrow. This is the escow object: ${escrow}`);
  });
  escrowContract.on('AllConsented', (string) => {
    console.log(string);
  });
  escrowContract.on('DepositedInEscrow', (depositor, escrowaccount, amount) => {
    console.log(`${depositor} deposited EUR ${amount} in escrowaccount with address: ${escrowaccount}`);
  });

    // const txproposeEscrow = await escrowContract.connect(depositorSigner).proposeEscrow(depositorSigner.address, beneficiarySigner.address, arbiterSigner.address, escrowAmount);
    // await txproposeEscrow.wait();

    const txConsentBen = await escrowContract.connect(beneficiarySigner).consentToEscrow(0);
    await txConsentBen.wait();

    // const txConsentArb = await escrowContract.connect(arbiterSigner).consentToEscrow(0);
    // await txConsentArb.wait();

    // txDeposit = await escrowContract.connect(depositorSigner).depositInEscrow(0, escrowAmount);
    // await txDeposit.wait();

    // console.log("chainAccountContract: ", chainAccountContract);

    // console.log("Logging bankSigner.address: ", bankSigner.address);
  
    // let balanceBank = await chainAccountContract.getBalance(bankSigner.address).then((result)=> result.toString()).catch((err)=>console.log(err));
    // let balanceDepositor = await chainAccountContract.balanceOf(depositorSigner.address)
    // .then((result)=> result.toString()).catch((err)=>console.log(err));
    // let balanceBeneficiary = await chainAccountContract.balanceOf(beneficiarySigner.address)
    // .then((result)=> result.toString()).catch((err)=>console.log(err));
    // let totalOutstanding = await chainAccountContract.totalAmountOnChain()
    // .then((result)=> result.toString()).catch((err)=> console.log(err));
    
    // console.log("Balance bank: ", balanceBank);
    // console.log("Balance depositor: ", balanceDepositor);
    // console.log("Balance beneficiary: ", balanceBeneficiary);
    // console.log("Total outstanding: ", totalOutstanding);

}

main()
.then(()=> process.exit(0))
.catch((err)=> {
    console.log(err);
    process.exit(1);
});