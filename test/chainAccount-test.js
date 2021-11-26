const { assert, expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require('fs');
const { escrowContractAddress, chainAccountContractAddress } = JSON.parse(fs.readFileSync("./config.json"));

console.log("Address chainAccountContract: ", chainAccountContractAddress);
console.log("Address escrowContract: ", escrowContractAddress);

describe("Contracts", function() {

    before("Get both contracts and set constants", async function() {
      const [bankSigner, depositorSigner, beneficiarySigner, arbiterSigner] = await ethers.getSigners();
      console.log("keys of banksigner: ", Object.keys(bankSigner));
      const chainAccountContract = await ethers.getContractAt("ChainAccount", bankSigner);
      console.log("Logging type of chainAccountContract: ", typeof chainAccountContract);
      console.log("Logging address of chainAccountContract: ", chainAccountContract.address);
      const escrowContract = await ethers.getContractAt("EscrowContract", bankSigner);
    });

    it("chainAccountContract object should be available", async function() {
      assert.equal("object", typeof chainAccountContract);
    });

    it("escrowAccountContract object should be available", async function() {
      assert.equal("object", typeof escrowContract);
    });
});




// describe("Greeter", function () {
//   it("Should return the new greeting once it's changed", async function () {
//     const Greeter = await ethers.getContractFactory("Greeter");
//     const greeter = await Greeter.deploy("Hello, world!");
//     await greeter.deployed();

//     expect(await greeter.greet()).to.equal("Hello, world!");

//     const setGreetingTx = await greeter.setGreeting("Hola, mundo!");

//     // wait until the transaction is mined
//     await setGreetingTx.wait();

//     expect(await greeter.greet()).to.equal("Hola, mundo!");
//   });
// });
