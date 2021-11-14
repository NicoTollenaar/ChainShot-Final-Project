//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";


contract ABNAMROchainCheque is ERC20Burnable {

    address public issuer;

    constructor() ERC20("ABNAMROchainChequeDollars", "$-CHQ-ABN") {
        issuer = msg.sender;
    }

    // The amount to be issued must be entered in cents, decimals(2).

    function decimals() public pure override returns (uint8) {
        return 2;
    }

    function issueCheque (address accountholder, uint amount) public {
        require(msg.sender == issuer, "Only an issuer can issue cheques");
        _mint(msg.sender, amount);
        transfer(accountholder, amount);
    }

    function transferCheque(address recipient, uint amount) public {
        require(balanceOf(msg.sender) >= amount, "Insufficient cheque balance");
        transfer(recipient, amount);
    }

    function redeemCheque(uint amount) public {
        require(balanceOf(msg.sender) >= amount, "Redemption amount greater than cheque balance");
        transfer(issuer, amount);
    }

    function burnCheque(uint amount) public {
        require(msg.sender == issuer, "Only an issuer can burn cheques");
        require(balanceOf(issuer) >= amount);
        _burn(issuer, amount);
    }

    function totalOutstandingCheques() public view returns(uint) {
        return totalSupply();
    }
}











