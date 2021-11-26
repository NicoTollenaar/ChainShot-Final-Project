//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./ChainAccount.sol";

// This is a simple escrow with one depositor, one beneficiary and one arbiter.
    // The contract can be expanded to deal with an undetermined number of parties.
    // Query: should there be one deployment per escrow or one deployment for multiple escrows
    // This contract assumes the latter.

contract EscrowContract {

    ChainAccount chainAccount;
    address public owner; 

    enum EscrowStatus {
        Proposed,
        Approved,
        FullyFunded,
        Executed
    }

    struct Escrow {
        address depositor;
        address beneficiary;
        address arbiter;
        uint escrowAmount;
        uint depositedAmount;
        uint escrowId;
        EscrowStatus status;
    }

    Escrow[] public escrowArray;
    
    address[] public parties;

    mapping (address=> mapping(uint => bool)) consents;

	constructor(address addressChainAccount) payable {
        chainAccount = ChainAccount(addressChainAccount);
        owner = msg.sender;
	}

    event ProposedEscrow(Escrow indexed _escrow);
    function proposeEscrow(address _depositor, address _beneficiary, address _arbiter, uint _escrowAmount) public {
        uint escrowId = escrowArray.length;
        Escrow memory escrow = Escrow(_depositor, _beneficiary, _arbiter, _escrowAmount, 0, escrowId, EscrowStatus.Proposed);
        parties = [_depositor, _beneficiary, _arbiter];
        escrowArray.push(escrow);
        emit ProposedEscrow(escrow);
        consentToEscrow(escrowId);
    }

    function isParty() public view returns(bool) {
        for (uint i=0; i < parties.length; i++) {
            if (parties[i] == msg.sender) {
                return true;
            } 
        }
        return false;
    }

    event ConsentToEscrow(address indexed sender, Escrow indexed _escrow);
    function consentToEscrow(uint _escrowId) public {
        require(escrowArray[_escrowId].status == EscrowStatus.Proposed, "Not elibible for consent");
        require(isParty(), "Only a contemplated party can consent to a proposed escrow");
        consents[msg.sender][_escrowId] = true;
        emit ConsentToEscrow(msg.sender, escrowArray[_escrowId]);
        allConsented(_escrowId);
    }

    event AllConsented(string message);
    function allConsented(uint escrowId) public returns(bool) {
        require(isParty(), "Unauthorized");
        for (uint i = 0; i < parties.length; i++) {
            if (consents[parties[i]][escrowId] == false) { 
                return false; 
            }
        }
        escrowArray[escrowId].status = EscrowStatus.Approved;
        emit AllConsented("All have consented");
        return true;
    }

    function getConsents(uint escrowId) public view returns(address[3] memory) {
        address[3] memory consentedParties;
        uint index;
        for (uint i = 0; i < parties.length; i++) {
            if (consents[parties[i]][escrowId] == true) {
                consentedParties[index] = parties[i];
                index++;
            }
        }
        return consentedParties;
    }

    event DepositedInEscrow(address _depositor, address escrowContract, uint _amount);
    function depositInEscrow(uint escrowId, uint amount) public {
        Escrow memory escrow = escrowArray[escrowId]; 
        require(escrow.arbiter != address(0) && escrow.beneficiary != address(0), "no address for beneficiary or arbiter");
        require(escrow.status == EscrowStatus.Approved, "Escrow not yet approved");
        require(escrow.status != EscrowStatus.FullyFunded, "Escrow already fully funded");
        require(escrow.escrowAmount - escrow.depositedAmount - amount >= 0, "Deposit exceeds escrow amount");
        require(escrow.depositor == msg.sender, "Only depositor can place funds in escrow");
        chainAccount.transferFunds(address(this), amount);
        escrow.depositedAmount += amount;
        if (escrow.depositedAmount == escrow.escrowAmount) {
            escrow.status = EscrowStatus.FullyFunded;
        }
        emit DepositedInEscrow(escrow.depositor, address(this), amount);
    }

	event Approved(address indexed _depositor, address indexed _beneficiary, uint indexed _amountApproved);
	function approve(uint escrowId, uint approvedAmount) external {
        Escrow memory escrow = escrowArray[escrowId];
        require(escrow.arbiter != address(0) && escrow.beneficiary != address(0) && escrow.depositor != address(0), "address lacking");
        require(allConsented(escrowId));
        require(escrow.status == EscrowStatus.FullyFunded, "Escrow must be fully funded");
		require(msg.sender == escrow.arbiter, "Only arbiter can approve");
        require(approvedAmount <= escrow.escrowAmount, "Approved amount greater than escrow amount");
        require(approvedAmount >= escrow.depositedAmount, "Insufficient funds deposited");
        uint remainder = escrow.depositedAmount - approvedAmount;
		chainAccount.transferFunds(escrow.beneficiary, approvedAmount);
        chainAccount.transferFunds(escrow.depositor, remainder);
		emit Approved(escrow.depositor, escrow.beneficiary, approvedAmount);
        escrow.status = EscrowStatus.Executed;
	}
}
