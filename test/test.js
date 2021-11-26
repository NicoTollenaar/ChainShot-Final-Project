const { assert, expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require('fs');
const { channel } = require("diagnostics_channel");
const { escrowContractAddress, chainAccountContractAddress } = JSON.parse(fs.readFileSync("./config.json"));

console.log("Address chainAccountContract from config: ", chainAccountContractAddress);
console.log("Address escrowContract from config: ", escrowContractAddress);

let bankSigner, depositorSigner, beneficiarySigner, arbiterSigner;
let chainAccountContract, escrowContract;

describe("Contracts", function() {
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

  it.skip("chainAccountContract address should be available", async function() {
    assert.equal(chainAccountContractAddress, chainAccountContract.address);
  });

  it.skip("escrowAccountContract object should be available", async function() {
    assert.equal(escrowContractAddress, escrowContract.address);
  });

  it("should transfer 20000 in funds to depositor", async function () {
    this.timeout(0);
    const balanceBefore = await chainAccountContract.balanceOf(depositorSigner.address);
    const transferAmount = 20000;
    const tx = await chainAccountContract.moveFundsOnChain(depositorSigner.address, transferAmount);
    await tx.wait();
    const balanceAfter = await chainAccountContract.balanceOf(depositorSigner.address);
    assert.equal((parseInt(balanceBefore, 10) + transferAmount), parseInt(balanceAfter, 10));
  });

  describe("propose three escrows", async function() {
    this.timeout(0);
    before(function(){
      escrowContract.on('ProposedEscrow', (address, escrow) => {
        console.log(`Emitted event: new escrow has been proposed by ${address}`);
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

  });

});

