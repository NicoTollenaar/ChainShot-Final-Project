const { assert, expect } = require("chai");
const { ethers } = require("hardhat");

let bankSigner, depositorSigner, beneficiarySigner, arbiterSigner;
let chainAccountContract, escrowContract;
let amount;

describe("Contracts", async function() {
  before(async function() {
    bankSigner = await ethers.getSigner(0); // bank is deployer
    depositorSigner = await ethers.getSigner(1);
    beneficiarySigner = await ethers.getSigner(2); 
    arbiterSigner = await ethers.getSigner(3);

    console.log ("bank: ", bankSigner.address);
    console.log ("depositor: ", depositorSigner.address);
    console.log ("beneficiary: ", beneficiarySigner.address);
    console.log ("arbiter: ", arbiterSigner.address);
    
    const chainAccountFactory = await ethers.getContractFactory("ChainAccount");
    chainAccountContract = await chainAccountFactory.deploy();
    await chainAccountContract.deployed();

    const escrowFactory = await ethers.getContractFactory("EscrowContract", bankSigner); 
    escrowContract = await escrowFactory.deploy(chainAccountContract.address);
    await escrowContract.deployed();

    console.log("chainAccountContract deployed to address:", chainAccountContract.address);
    console.log("chainAccountContract deployer: ", chainAccountContract.signer.address);
    console.log("escrowContract deployed to address:", escrowContract.address);
    console.log("EscrowContract deployer: ", escrowContract.signer.address);
  });

  it("should deploy chainAccountContract", ()=> {
    assert(chainAccountContract.address);
  });
  it("should deploy escrowContract", ()=> {
    assert(escrowContract.address);
  });

  describe("chainAccountContract", async ()=>{
    describe("chainAccountContract.name()", async function() {
      	it("should get the name of the contract", async function() {
          const contractName = await chainAccountContract.name();
          const expectedName =  "chainAccountDollars";
          assert.equal(contractName, expectedName);
        });
    });

    describe("chainAccountrContract.moveFundsOnChain()", async function(){
      beforeEach(()=>{
        amount = 20000;
      });
      afterEach(async function(){
        const tx = await chainAccountContract.connect(depositorSigner).moveFundsOffChain(amount);
        await tx.wait();
      });
      it("should move indicated funds to on-chain account", async function() {
        const balanceBefore = await chainAccountContract.balanceOf(depositorSigner.address);
        const tx = await chainAccountContract.moveFundsOnChain(depositorSigner.address, amount);
        await tx.wait();
        const balanceAfter = await chainAccountContract.balanceOf(depositorSigner.address);
        assert.equal((parseInt(balanceBefore, 10) + amount), parseInt(balanceAfter, 10));
        console.log("Logging balance of depositor after moving on-chain: ", parseInt(balanceAfter, 10));
      });
    });
    
    describe("chainAccountContract.transferFunds", async function(){
      let amount, balanceDepositorBefore, balanceBeneficiaryBefore;
      before(async function() {
        amount = 20000;
        const tx1 = await chainAccountContract.moveFundsOnChain(depositorSigner.address, amount);
        await tx1.wait();
        balanceDepositorBefore = await chainAccountContract.balanceOf(depositorSigner.address);
        balanceBeneficiaryBefore = await chainAccountContract.balanceOf(beneficiarySigner.address);
        console.log("Balance depositor before: ", parseInt(balanceDepositorBefore, 10));
        console.log("Balance beneficiary before: ", parseInt(balanceBeneficiaryBefore, 10));
        const tx2 = await chainAccountContract.connect(depositorSigner).transferFunds(beneficiarySigner.address, amount);
        await tx2.wait();
      });
      it("should transfer indicated amount out of depositor's account", async function() {
        const balanceAfter = await chainAccountContract.balanceOf(depositorSigner.address);
        assert.equal(parseInt(balanceDepositorBefore, 10) - amount, parseInt(balanceAfter, 10));
        console.log("Logging balance of depositor after transfer: ", parseInt(balanceAfter, 10));
      });
      it("should transfer indicated amount into beneficiary's account", async function(){
        const balanceAfter = await chainAccountContract.balanceOf(beneficiarySigner.address);
        assert.equal(parseInt(balanceBeneficiaryBefore, 10) + amount, parseInt(balanceAfter, 10));
        console.log("Logging balance of beneficiary after transfer: ", parseInt(balanceAfter, 10));
      });
    });
    describe("chainAccountContract.moveFundsOffChain", async function(){
      let amount, balanceBeneficiaryBefore, balanceBankBefore;
      before(async function() {
        amount = 20000;
        balanceBeneficiaryBefore = await chainAccountContract.balanceOf(beneficiarySigner.address);
        balanceBankBefore = await chainAccountContract.balanceOf(bankSigner.address);
        console.log("Balance beneficiary before: ", parseInt(balanceBeneficiaryBefore, 10));
        console.log("Balance bank before: ", parseInt(balanceBankBefore, 10));
        const tx = await chainAccountContract.connect(beneficiarySigner).moveFundsOffChain(amount);
        await tx.wait();
      });
      it("should transfer indicated amount out of beneficiary's account", async function() {
        const balanceAfter = await chainAccountContract.balanceOf(beneficiarySigner.address);
        assert.equal(parseInt(balanceBeneficiaryBefore, 10) - amount, parseInt(balanceAfter, 10));
        console.log("Logging balance of depositor after transfer: ", parseInt(balanceAfter, 10));
      });
      it("should transfer indicated amount to bank", async function(){
        const balanceAfter = await chainAccountContract.balanceOf(bankSigner.address);
        assert.equal(parseInt(balanceBankBefore, 10) + amount, parseInt(balanceAfter, 10));
        console.log("Logging balance of bank after transfer: ", parseInt(balanceAfter, 10));
      });
    })
    
    describe("chainAccountContract.deleteInternalBalanceBank", async function(){
      let balanceBankBefore;
      before(async function() {
        balanceBankBefore = await chainAccountContract.balanceOf(bankSigner.address);
        console.log("Balance bank before: ", parseInt(balanceBankBefore, 10));
        const tx = await chainAccountContract.connect(bankSigner).deleteInternalBalanceBank(balanceBankBefore);
        await tx.wait();
      });
      it("should delete internal balance bank", async function(){
        const balanceAfter = await chainAccountContract.balanceOf(bankSigner.address);
        assert.ok(parseInt(balanceAfter, 10) === 0);
        console.log("Logging balance of bank after transfer: ", parseInt(balanceAfter, 10));
      });
    });
  });

  describe("escrowContract", async function(){
    let proposals = [];
    describe("escrowContract.proposeEscrow", async function(){
      const escrowAmounts = [10000, 5000, 2000];
      let amountsFromEscrows = [];
      let emittedAddress;
      let emittedId;
      before(async function(){
        escrowContract.on('ProposedEscrow', (address, escrowId) => {
          emittedAddress = address;
          emittedId = escrowId;
          console.log(`Emitted event: escrow proposed by${emittedAddress} with Id ${emittedId}`);
        });
        let proposalRaw;
        let readableStatus;
        let escrowProposal;
        for (let i=0; i < escrowAmounts.length; i++) {
          const tx = await escrowContract.connect(depositorSigner).proposeEscrow(depositorSigner.address, beneficiarySigner.address, arbiterSigner.address, escrowAmounts[i]);
          await tx.wait();
          proposalRaw = await escrowContract.getEscrowProposal(i);
          proposalRaw[7] === 0? readableStatus = "Proposed" :
          proposalRaw[7] === 1? readableStatus = "Approved" :
          proposalRaw[7] === 2? readableStatus = "FullyFunded" :
          proposalRaw[7] === 3? readableStatus = "Executed" : readableStatus = "Cancelled";
          escrowProposal = {
            proposer: proposalRaw[0],
            depositor: proposalRaw[1],
            beneficiary: proposalRaw[2],
            arbiter: proposalRaw[3],
            amount: parseInt(proposalRaw[4], 10),
            deposited: parseInt(proposalRaw[5], 10),
            Id: parseInt(proposalRaw[6], 10),
            status: readableStatus,
          }
          proposals.push(escrowProposal);
          amountsFromEscrows.push(escrowProposal.amount);
          console.log("Logging escrowProposal: ", escrowProposal);
        }
        console.log("Logging amounts from escrowproposals: ", amountsFromEscrows);
      });

      it("should propose three escrows", async function(){
        assert.deepStrictEqual(amountsFromEscrows, escrowAmounts);
      });
      
      // it("should emit a ProposedEscrow event", async function(){
      //   console.log("Logging emittedAddress: ", emittedAddress);
      //   console.log("Logging depositorAddress: ", depositorSigner.address);
      //   assert.ok(emittedAddress == depositorSigner.address);
      // });
    });

    describe("escrowContract.consentToEscrow", async function(){
      let emittedAddress;
      let emittedId;
      before(async function(){
        escrowContract.on('ConsentToEscrow', (address, escrowId) => {
          console.log(`Emitted event: Escrow with Id ${escrowId} has been consented to by ${address}`);
          emittedAddress = address;
          emittedId = escrowId;
        });
      });
      it("should confirm that beneficiary has consented to all three proposals", async function(){
        let counter = 0;
        for (let i = 0; i < proposals.length; i++) {
          let consentedParties = [];
          const txConsentBen = await escrowContract.connect(beneficiarySigner).consentToEscrow(i);
          await txConsentBen.wait();
          consentedParties = await escrowContract.getConsents(i);
          if (consentedParties[1] === beneficiarySigner.address) { counter++; }
          console.log("Logging received consents (array) for each escrow: ", consentedParties);
        }
        assert(counter, proposals.length);
      });
      // const txConsentArb = await escrowContract.connect(arbiterSigner).consentToEscrow(0);
      // await txConsentArb.wait();
    });
  });
});

// console.log(`Logging proposal ${i}: `, proposals[i]);



// describe("Propose three escrows", async function() {
//   beforeEach(async function(){
//     const escrowAmounts = [10000, 5000, 2000];
//     const proposals = [];
//     const amountsFromEscrows = [];
//     let proposal, tx;
//     for (let i=0; i < escrowAmounts.length; i++) {
//       tx = await escrowContract.connect(depositorSigner).proposeEscrow(depositorSigner.address, beneficiarySigner.address, arbiterSigner.address, escrowAmounts[i]);
//       await tx.wait();
//       proposal = await escrowContract.getEscrowProposal(i);
//       proposals.push(proposal);
//       amountsFromEscrows.push(parseInt(proposal[3], 10));
//       console.log(`Logging proposal ${i}: `, proposals[i]);
//     }
//     console.log("Logging amounts from escrowproposals: ", amountsFromEscrows);
//   });

//   it("should confirm that three escrows have been proposed", async function(){
//     assert.equal(escrowAmounts, amountsFromEscrows);
//     });