const { assert, expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require('fs');
const { escrowContractAddress, chainAccountContractAddress } = JSON.parse(fs.readFileSync("./config.json"));

console.log("Address chainAccountContract from config: ", chainAccountContractAddress);
console.log("Address escrowContract from config: ", escrowContractAddress);

let bankSigner, depositorSigner, beneficiarySigner, arbiterSigner;
let chainAccountContract, escrowContract;

ethers.getContractAt("ChainAccount", chainAccountContractAddress)
.then((result) => {
  chainAccountContract = result;
  console.log("Logging typeof chainAccountContract: ", typeof chainAccountContract);})
.catch((err)=>console.log(err));

describe("Get contracts", function() {
  before(async function() {
    [bankSigner, depositorSigner, beneficiarySigner, arbiterSigner] = await ethers.getSigners();
    console.log(`Bank: ${bankSigner.address}\nDepositor: ${depositorSigner.address}\nBeneficiary: ${beneficiarySigner.address}\nArbiter: ${arbiterSigner.address}`);
    console.log("keys of banksigner: ", Object.keys(bankSigner));
    chainAccountContract = await ethers.getContractAt("ChainAccount", chainAccountContractAddress );
    console.log("Logging type of chainAccountContract: ", typeof chainAccountContract);
    console.log("Logging address of chainAccountContract: ", chainAccountContract.address);
    escrowContract = await ethers.getContractAt("EscrowContract", escrowContractAddress);
    console.log("Logging type of escrowContract: ", typeof escrowContract);
    console.log("Logging address of escrowContract: ", escrowContract.address);
  });

  it.skip("should provide an address on the chainAccountContract object", async function() {
    assert.equal(chainAccountContractAddress, chainAccountContract.address);
  });

  it.skip("should provide an addrress on the escrowContract object", async function() {
    assert.equal(escrowContractAddress, escrowContract.address);
  });

  describe("Move funds to on-chain account of depositor", async function(){
    this.timeout(0);
    const balanceBefore = await chainAccountContract.balanceOf(depositorSigner.address);
    const transferAmount = 20000;
    it("should transfer 20000 in funds to depositor", async function () {
      const tx = await chainAccountContract.moveFundsOnChain(depositorSigner.address, transferAmount);
      await tx.wait();
      const balanceAfter = await chainAccountContract.balanceOf(depositorSigner.address);
      assert.equal((parseInt(balanceBefore, 10) + transferAmount), parseInt(balanceAfter, 10));
    });

    describe("Propose three escrows", async function() {
      this.timeout(0);
      before(function(){
        escrowContract.on('ProposedEscrow', (address, escrow) => {
          console.log(`Emitted event: new escrow has been proposed by ${address}`);
        });
        escrowContract.on('DepositedInEscrow', (depositor, escrowaccount, amount) => {
          console.log(`${depositor} deposited EUR ${amount} in escrowaccount with address: ${escrowaccount}`);
        });
      });

      it("should confirm that three escrows have been proposed", async function(){
        this.timeout(0);
        const escrowAmounts = [10000, 5000, 2000];
        const proposals = [];
        const amountsFromEscrows = [];
        let proposal, tx;
        for (let i=0; i < escrowAmounts.length; i++) {
          tx = await escrowContract.connect(depositorSigner).proposeEscrow(depositorSigner.address, beneficiarySigner.address, arbiterSigner.address, escrowAmounts[i]);
          await tx.wait();
          proposal = await escrowContract.getEscrowProposal(i);
          proposals.push(proposal);
          amountsFromEscrows.push(parseInt(proposal[3], 10));
          console.log(`Logging proposal ${i}: `, proposals[i]);
        }
        console.log("Logging amounts from escrowproposals: ", amountsFromEscrows);
        assert.equal(escrowAmounts, amountsFromEscrows);
        });
      
      describe("Approve the first proposed escrow", async function (){
        before(function (){
          escrowContract.on('ConsentToEscrow', (address, escrow) => {
            console.log(`Emitted event: ${address} has consented to the proposed Escrow. This is the escrowId: ${escrow}`);
          });
          escrowContract.on('AllConsented', (string) => {
            console.log(string);
          });
        });

        it("should confirm that the beneficiary has consented", async function() {
          const tx = await escrowContract.connect(beneficiarySigner).consentToEscrow(0);
          await tx.wait();
          const receivedConsents = await escrowContract.getConsents(0);
          console.log(`Logging consents on escrowId ${1}: `, receivedConsents);
          assert.equal([depositorSigner, beneficiarySigner, 0], receivedConsents); 
        });

        it("should confirm that the arbiter has consented", async function() {
          const tx = await escrowContract.connect(arbiterSigner).consentToEscrow(0);
          await tx.wait();
          const receivedConsents = await escrowContract.getConsents(0);
          console.log(`Logging consents on escrowId ${1}: `, receivedConsents);
          assert.equal([depositorSigner, beneficiarySigner, arbiterSigner], receivedConsents); 
        });

        it("should confirm that all have consented", async function() {
          const tx = await escrowContract.allConsented(0);
          await tx.wait();
          assert.equal(tx, true); 
        });
      });
    });
  });
});

