//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";


contract ChainAccount is ERC20Burnable {

    address public bank;

    constructor() ERC20("chainAccountDollars", "$-ON-CHAIN-BANK-X") {
        bank = msg.sender;
    }

    // The amount to be issued must be entered in cents, decimals(2).

    receive() external payable {}

    function decimals() public pure override returns (uint8) {
        return 2;
    }

    function moveFundsOnChain(address accountholder, uint amount) public {
        require(msg.sender == bank, "Only bank can transfer funds from off- to on-chain account");
        _mint(msg.sender, amount);
        transfer(accountholder, amount);
    }
    
    function transferFunds(address recipient, uint256 amount) public payable {
        console.log("Logging in chainAccountContr msg.sender and balance: ", msg.sender, balanceOf(msg.sender));
        require(balanceOf(msg.sender) >= amount, "Insufficient on-chain balance");
        transfer(recipient, amount);
    }

    function moveFundsOffChain(uint amount) public {
        require(balanceOf(msg.sender) >= amount, "Retransfer amount greater than on chain balance");
        transfer(bank, amount);
    }

    function deleteInternalBalanceBank(uint amount) public {
        require(msg.sender == bank, "Only the bank can delete its own internal on-chain balance");
        require(balanceOf(bank) >= amount);
        _burn(bank, amount);
    }

    function getBalance(address _address) public view returns(uint) {
        return balanceOf(_address);
    }
    function totalAmountOnChain() public view returns(uint) {
        return totalSupply();
    }
}











