const { assert, expect } = require("chai");
const { ethers } = require("hardhat");

describe("Contracts", async function() {
  let bankSigner, depositorSigner, beneficiarySigner, arbiterSigner;
  let chainAccountContract, escrowContract;
  let balanceBankBefore, balanceBankAfter;
  let balanceDepositorBefore, balanceDepositorAfter; 
  let balanceBeneficiaryBefore, balanceBeneficiaryAfter;
  let balanceContractBefore, balanceContractAfter;

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
  let amount = 30000;
    describe("chainAccountContract.name()", async function() {
      	it("should get the name of the contract", async function() {
          const contractName = await chainAccountContract.name();
          const expectedName =  "chainAccountDollars";
          assert.equal(contractName, expectedName);
        });
    });

    describe("chainAccountrContract.moveFundsOnChain()", async function(){
      afterEach(async function(){
        const tx = await chainAccountContract.connect(depositorSigner).moveFundsOffChain(amount);
        await tx.wait();
      });
      it("should move indicated funds on-chain", async function() {
        balanceDepositorBefore = await chainAccountContract.balanceOf(depositorSigner.address);
        const tx = await chainAccountContract.moveFundsOnChain(depositorSigner.address, amount);
        await tx.wait();
        balanceDepositorAfter = await chainAccountContract.balanceOf(depositorSigner.address);
        assert.equal((parseInt(balanceDepositorBefore, 10) + amount), parseInt(balanceDepositorAfter, 10));
        console.log("Logging balance of depositor after moving on-chain: ", parseInt(balanceDepositorAfter, 10));
      });
    });
    
    describe("chainAccountContract.transferFunds", async function(){
      before(async function() {
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
        balanceDepositorAfter = await chainAccountContract.balanceOf(depositorSigner.address);
        assert.equal(parseInt(balanceDepositorBefore, 10) - amount, parseInt(balanceDepositorAfter, 10));
        console.log("Logging balance of depositor after transfer: ", parseInt(balanceDepositorAfter, 10));
      });

      it("should transfer indicated amount into beneficiary's account", async function(){
        balanceBeneficiaryAfter = await chainAccountContract.balanceOf(beneficiarySigner.address);
        assert.equal(parseInt(balanceBeneficiaryBefore, 10) + amount, parseInt(balanceBeneficiaryAfter, 10));
        console.log("Logging balance of beneficiary after transfer: ", parseInt(balanceBeneficiaryAfter, 10));
      });
    });

    describe("chainAccountContract.moveFundsOffChain", async function(){
      before(async function() {
        balanceBeneficiaryBefore = await chainAccountContract.balanceOf(beneficiarySigner.address);
        balanceBankBefore = await chainAccountContract.balanceOf(bankSigner.address);
        console.log("Balance beneficiary before: ", parseInt(balanceBeneficiaryBefore, 10));
        console.log("Balance bank before: ", parseInt(balanceBankBefore, 10));
        const tx = await chainAccountContract.connect(beneficiarySigner).moveFundsOffChain(amount);
        await tx.wait();
      });

      it("should transfer indicated amount out of beneficiary's account", async function() {
        balanceBeneficiaryAfter = await chainAccountContract.balanceOf(beneficiarySigner.address);
        assert.equal(parseInt(balanceBeneficiaryBefore, 10) - amount, parseInt(balanceBeneficiaryAfter, 10));
        console.log("Logging balance of depositor after transfer: ", parseInt(balanceBeneficiaryAfter, 10));
      });

      it("should transfer indicated amount to bank", async function(){
        balanceBankAfter = await chainAccountContract.balanceOf(bankSigner.address);
        assert.equal(parseInt(balanceBankBefore, 10) + amount, parseInt(balanceBankAfter, 10));
        console.log("Logging balance of bank after transfer: ", parseInt(balanceBankAfter, 10));
      });
    })
    
    describe("chainAccountContract.deleteInternalBalanceBank", async function(){
      before(async function() {
        balanceBankBefore = await chainAccountContract.balanceOf(bankSigner.address);
        console.log("Balance bank before: ", parseInt(balanceBankBefore, 10));
        const tx = await chainAccountContract.connect(bankSigner).deleteInternalBalanceBank(balanceBankBefore);
        await tx.wait();
      });

      it("should delete internal balance bank", async function(){
        balanceBankAfter = await chainAccountContract.balanceOf(bankSigner.address);
        assert.ok(parseInt(balanceBankAfter, 10) === 0);
        console.log("Logging balance of bank after transfer: ", parseInt(balanceBankAfter, 10));
      });
    });

    describe("chainAccountContract.transferFromContract", async function(){
      before(async function(){
        const tx = await chainAccountContract.moveFundsOnChain(escrowContract.address, amount);
        await tx.wait();
        balanceContractBefore = await chainAccountContract.balanceOf(escrowContract.address);
        console.log("Balance escrow before: ", parseInt(balanceContractBefore, 10));
        const tx2 = await chainAccountContract.connect(arbiterSigner).transferFromContract(arbiterSigner.address, escrowContract.address, bankSigner.address, amount);
        await tx2.wait();
        balanceEscrowContractAfter = await chainAccountContract.balanceOf(escrowContract.address);
        console.log("Balance escrow after: ", parseInt(balanceEscrowContractAfter, 10));
      }); 

      it("should transfer funds held by a contract", function(){
        assert.equal(parseInt(balanceContractBefore, 10) - amount, parseInt(balanceEscrowContractAfter, 10));
      });
    });

    describe("chainAccountContract.approve", async function(){
      before(async function(){
        const txMv = await chainAccountContract.moveFundsOnChain(depositorSigner.address, amount);
        await txMv.wait();
        const txApprove = await chainAccountContract.connect(depositorSigner).approve(arbiterSigner.address, amount);
        await txApprove.wait();
        const allowance = await chainAccountContract.allowance(depositorSigner.address, arbiterSigner.address);
        console.log("Logging allowance: ", parseInt(allowance, 10));
        balanceContractBefore = await chainAccountContract.balanceOf(escrowContract.address);
        console.log("Logging balance escrowContract before: ", parseInt(balanceContractBefore, 10));
        const txTransfer = await chainAccountContract.connect(arbiterSigner)
        .transferUsingAllowance(depositorSigner.address, escrowContract.address, amount);
        await txTransfer.wait();
      });

      afterEach(async function(){
        const tx = await chainAccountContract.connect(depositorSigner).approve(arbiterSigner.address, 0);
        await tx.wait();
        const allowanceAfter = await chainAccountContract.allowance(depositorSigner.address, arbiterSigner.address);
        console.log("Logging allowance after: ", parseInt(allowanceAfter, 10));
        const tx2 = await chainAccountContract.connect(arbiterSigner).transferFromContract(arbiterSigner.address, escrowContract.address, bankSigner.address, amount);
        await tx2.wait();
      });

      it("should allow spender to transfer funds owner", async function(){
        const balanceEscrowContractAfter = await chainAccountContract.balanceOf(escrowContract.address);
        console.log("Logging balance escrowContract after: ", parseInt(balanceEscrowContractAfter, 10));
        assert.equal(parseInt(balanceContractBefore, 10) + amount, parseInt(balanceEscrowContractAfter, 10));
      });
    });

  });

  describe("escrowContract", async function(){
    let escrowProposalBefore;
    let rawProposal;
    let escrowProposal;
    let proposals = [];
    const escrowAmounts = [10000, 5000, 2000];

    describe("escrowContract.proposeEscrow", async function(){
      let amountsFromEscrows = [];
      let receipt;

      before(async function(){
        for (let i=0; i < escrowAmounts.length; i++) {
          const tx = await escrowContract.connect(depositorSigner).proposeEscrow(depositorSigner.address, beneficiarySigner.address, arbiterSigner.address, escrowAmounts[i]);
          receipt = await tx.wait();
          rawProposal = await escrowContract.getEscrowProposal(i);
          escrowProposal = parseRawProposal(rawProposal);
          proposals.push(escrowProposal);
          amountsFromEscrows.push(escrowProposal.amount);
          console.log("Logging escrowProposal: ", escrowProposal);
        }
        console.log("Logging amounts from escrowproposals: ", amountsFromEscrows);
      });

      it("should propose three escrows", async function(){
        assert.deepStrictEqual(amountsFromEscrows, escrowAmounts);
      });

      it("should emit a ProposedEscrow event", async function(){
        const event = escrowContract.interface.getEvent("ProposedEscrow");
        const topic = escrowContract.interface.getEventTopic('ProposedEscrow');
        const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
        const deployedEvent = escrowContract.interface.parseLog(log);
        // console.log("Logging topic: ", topic);
        assert(deployedEvent, "Expected the Fallback Called event to be emitted!");
        // console.log("logging escrowContract.interface: ", escrowContract.interface);
        // console.log("logging escrowContract.event: ", event);
        // console.log("logging escrowContract.eventTopic: ", topic);
        // console.log("logging escrowContract log: ", log);
        console.log("Logging deployedEvent: ", deployedEvent);
        //how can you extract the topics from deployedEvent? 
      });
    });

    describe("escrowContract.consentToEscrow", async function(){
      
      it("should confirm that beneficiary has consented to all three proposals", async function(){
        let counter = 0;
        for (let i = 0; i < proposals.length; i++) {
          let consentedParties = [];
          const txConsentBen = await escrowContract.connect(beneficiarySigner).consentToEscrow(i);
          receipt = await txConsentBen.wait();
          consentedParties = await escrowContract.getConsents(i);
          if (consentedParties[1] === beneficiarySigner.address) { counter++; }
          console.log("Logging received consents (array) for each escrow: ", consentedParties);
        }
        assert.equal(counter, proposals.length);
      });

      it("should emit a ConsentToEscrow event", async function(){
        await expect(escrowContract.connect(arbiterSigner).consentToEscrow(1))
        .to.emit(escrowContract, 'ConsentToEscrow')
        .withArgs(arbiterSigner.address, 1);
      });
    
    });

    describe("escrowContract when all consented", async function(){

      before(async function(){
        const txConsentArb = await escrowContract.connect(arbiterSigner).consentToEscrow(0);
        receipt = await txConsentArb.wait();
        const consentedParties = await escrowContract.getConsents(0);
        console.log("Logging consented parties: ", consentedParties);
      });

      it("should emit an AllConsented event", async function(){
        const event = escrowContract.interface.getEvent("AllConsented");
        const topic = escrowContract.interface.getEventTopic('AllConsented');
        const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
        const deployedEvent = escrowContract.interface.parseLog(log);
        assert(deployedEvent, "Expected the Fallback Called event to be emitted!");
      });

      it("should change the status of the proposal to 'Approved'", async function(){
        const rawProposal = await escrowContract.getEscrowProposal(0);
        const escrowProposal = parseRawProposal(rawProposal);
        console.log("Logging approved proposal: ", escrowProposal);
        assert(escrowProposal.status === "Approved");
      });
    });

    describe("escrowContract.depositInEscrow", async function(){
      before(async function(){
        const txMoveFunds = await chainAccountContract.moveFundsOnChain(depositorSigner.address, escrowAmounts[0]);
        await txMoveFunds.wait();
        const txApprove = await chainAccountContract.connect(depositorSigner).approve(escrowContract.address, escrowAmounts[0]);
        await txApprove.wait();
        balanceDepositorBefore = await chainAccountContract.balanceOf(depositorSigner.address);
        console.log("Logging depositor balance before: ", parseInt(balanceDepositorBefore, 10));
        balanceContractBefore = await chainAccountContract.balanceOf(escrowContract.address);
        console.log("Logging contractBalance before: ", parseInt(balanceContractBefore, 10));
        const rawProposalBefore = await escrowContract.getEscrowProposal(0);
        escrowProposalBefore = parseRawProposal(rawProposalBefore);
        console.log("Logging escrow proposal before deposit: ", escrowProposalBefore);
      });

      it("should transfer the deposit out of the depositor's account", async function (){
        const receipt = await escrowContract.depositInEscrow(depositorSigner.address, (escrowAmounts[0] - 10), 0);
        await receipt.wait();
        balanceDepositorAfter = await chainAccountContract.balanceOf(depositorSigner.address);
        balanceContractAfter = await chainAccountContract.balanceOf(escrowContract.address);
        console.log("Logging depositor after: ", parseInt(balanceDepositorAfter, 10));
        console.log("Logging contract after: ", parseInt(balanceContractAfter, 10));
        assert.equal(parseInt(balanceDepositorBefore) - (escrowAmounts[0] - 10), parseInt(balanceDepositorAfter, 10));
      });

      it("should transfer the deposit to the escrowcontract", function(){
        assert.equal(parseInt(balanceContractBefore) + (escrowAmounts[0] - 10), parseInt(balanceContractAfter, 10));
      });

      it("should add the deposited amount to the escrow struct", async function(){
        const rawProposalAfter = await escrowContract.getEscrowProposal(0);
        const escrowProposalAfter = parseRawProposal(rawProposalAfter);
        console.log("Logging escrow proposal after deposit: ", escrowProposalAfter);
        assert.equal(escrowProposalBefore.heldInDeposit + (escrowAmounts[0] - 10), escrowProposalAfter.heldInDeposit);
      });

      it("should emit a deposited in escrow event", async function() {
        await expect(escrowContract.depositInEscrow(depositorSigner.address, 5, 0))
        .to.emit(escrowContract,'DepositedInEscrow').withArgs(0, 5);
      });

      it("should emit a fully funded event", async function(){
        await expect(escrowContract.depositInEscrow(depositorSigner.address, 5, 0))
        .to.emit(escrowContract, 'FullyFunded')
        .withArgs(0, 10000);
      });

      it("should change the status of the escrow to fully funded", async function(){
        const rawProposal = await escrowContract.getEscrowProposal(0);
        const escrowProposal = parseRawProposal(rawProposal);
        assert.strictEqual(escrowProposal.status, "FullyFunded");
      });

      it("should reject further payments after escrow is fully funded", async function(){
        const tx = await chainAccountContract.moveFundsOnChain(depositorSigner.address, 50000);
        await tx.wait();
        const tx1 = await chainAccountContract.connect(depositorSigner).approve(escrowContract.address, 50000);
        await tx1.wait();
        await expect(escrowContract.depositInEscrow(depositorSigner.address, 50000, 0)).to.be.reverted
      });

      it("should transfer any excess amount back to depositor", async function(){
          const rawProposal = await escrowContract.getEscrowProposal(1);
          const escrowProposal = parseRawProposal(rawProposal);
          console.log("Logging approved proposal: ", escrowProposal);
          tx0 = await chainAccountContract.moveFundsOnChain(depositorSigner.address, (escrowAmounts[1] + 5));
          await tx0.wait();
        	const tx1 = await chainAccountContract.connect(depositorSigner).approve(escrowContract.address, (escrowAmounts[1] + 5));
          await tx1.wait();
          balanceDepositorBefore = await chainAccountContract.balanceOf(depositorSigner.address);
          console.log("Balance depositor before: ", parseInt(balanceDepositorBefore, 10));
          const tx2 = await escrowContract.depositInEscrow(depositorSigner.address, (escrowAmounts[1] + 5), 1);
          await tx2.wait();
          balanceDepositorAfter = await chainAccountContract.balanceOf(depositorSigner.address);
          console.log("Balance depositor after: ", parseInt(balanceDepositorAfter, 10));
          assert.equal(parseInt(balanceDepositorBefore, 10) - escrowAmounts[1], parseInt(balanceDepositorAfter, 10)); 
      });

      it("should should revert if attempted deposit exceeds escrow amount by more than 5%", async function(){
        tx = await escrowContract.connect(arbiterSigner).consentToEscrow(2);
        await tx.wait();
        const consentedParties = await escrowContract.getConsents(2);
        console.log("Logging consented parties: ", consentedParties);
        const rawProposal = await escrowContract.getEscrowProposal(2);
        const escrowProposal = parseRawProposal(rawProposal);
        console.log("Logging approved proposal: ", escrowProposal);
        tx0 = await chainAccountContract.moveFundsOnChain(depositorSigner.address, (2* escrowAmounts[2] - 5));
        await tx0.wait();
        const tx1 = await chainAccountContract.connect(depositorSigner).approve(escrowContract.address, 2*escrowAmounts[2]);
        await tx1.wait();
        balanceDepositorBefore = await chainAccountContract.balanceOf(depositorSigner.address);
        console.log("Balance depositor before: ", parseInt(balanceDepositorBefore, 10));
        await expect(escrowContract.depositInEscrow(depositorSigner.address, (2*escrowAmounts[2]), 2)).to.be.reverted;
        balanceDepositorAfter = await chainAccountContract.balanceOf(depositorSigner.address);
        console.log("Balance depositor after: ", parseInt(balanceDepositorAfter, 10));
      });
    });

    describe("escrowContract.approve", async function (){
      let approvedAmount = (escrowAmounts[0]/2);
      let remainder = escrowAmounts[0] - approvedAmount;
      it("should transfer approved amount from escrow to beneficiary", async function(){
        balanceContractBefore = await chainAccountContract.balanceOf(escrowContract.address);
        balanceBeneficiaryBefore = await chainAccountContract.balanceOf(beneficiarySigner.address);
        balanceDepositorBefore = await chainAccountContract.balanceOf(depositorSigner.address);
        balanceContractBefore = await chainAccountContract.balanceOf(escrowContract.address);
        console.log("Logging balance contract before: ", parseInt(balanceContractBefore, 10));
        console.log("Logging balance beneficairy before: ", parseInt(balanceBeneficiaryBefore,10));
        const tx = await escrowContract.connect(arbiterSigner).approve(0, approvedAmount);
        await tx.wait();
        balanceContractAfter = await chainAccountContract.balanceOf(escrowContract.address);
        balanceBeneficiaryAfter = await chainAccountContract.balanceOf(beneficiarySigner.address);
        console.log("Logging balance contract before: ", parseInt(balanceContractAfter, 10));
        console.log("Logging balance beneficairy before: ", parseInt(balanceBeneficiaryAfter,10));
        assert.equal(parseInt(balanceBeneficiaryBefore, 10) + approvedAmount, parseInt(balanceBeneficiaryAfter, 10));
      });

      it("should return remainder to depositor", async function(){
        balanceDepositorAfter = await chainAccountContract.balanceOf(depositorSigner.address);
        assert.equal(parseInt(balanceDepositorBefore, 10) + remainder, parseInt(balanceDepositorAfter, 10));
      });

      it("should have removed the total escrow amount from the escrow contract", async function(){
        balanceContractAfter = await chainAccountContract.balanceOf(escrowContract.address);
        assert.equal(parseInt(balanceContractBefore, 10) - escrowAmounts[0], parseInt(balanceContractAfter, 10));
      });

      it("should set the amount held in escrow to 0", async function(){
        rawProposal = await escrowContract.getEscrowProposal(0);
        escrowProposal = parseRawProposal(rawProposal);
        assert.equal(escrowProposal.heldInDeposit, 0);
      });

      it("should set the status to Executed", async function(){
        assert.strictEqual(escrowProposal.status, "Executed");
      });

      it("should emit an executed event", async function(){
        rawProposal = await escrowContract.getEscrowProposal(1);
        escrowProposal = parseRawProposal(rawProposal);
        console.log(escrowProposal);
        await expect(escrowContract.connect(arbiterSigner).approve(1, escrowAmounts[1]))
        .to.emit(escrowContract, "Executed").withArgs(1, escrowAmounts[1]);
      })
    });
  });
});

function parseRawProposal(rawProposal) {
  let readableStatus;
          rawProposal[7] === 0? readableStatus = "Proposed" :
          rawProposal[7] === 1? readableStatus = "Approved" :
          rawProposal[7] === 2? readableStatus = "FullyFunded" :
          rawProposal[7] === 3? readableStatus = "Executed" : readableStatus = "Withdrawn";
  let parsedProposal = {
    proposer: rawProposal[0],
    depositor: rawProposal[1],
    beneficiary: rawProposal[2],
    arbiter: rawProposal[3],
    amount: parseInt(rawProposal[4], 10),
    heldInDeposit: parseInt(rawProposal[5], 10),
    Id: parseInt(rawProposal[6], 10),
    status: readableStatus,
  }
  return parsedProposal;
}