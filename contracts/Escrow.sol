//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
pragma abicoder v2;

import "hardhat/console.sol";
import "./ChainAccount.sol";

// This is a simple escrow with one depositor, one beneficiary and one arbiter.
    // The contract can be expanded to deal with an undetermined number of parties.
    // Query: should there be one deployment per escrow or one deployment for multiple escrows
    // This contract assumes the latter.

contract EscrowContract {

    ChainAccount chainAccount;
    address public owner;
    uint public constant numberOfParties = 3; //one depositor, one beneficiary, one arbiter

    enum EscrowStatus {
        Proposed,
        Approved,
        FullyFunded,
        Executed,
        Cancelled
    }

    struct Escrow {
        address proposer;
        address depositor;
        address beneficiary;
        address arbiter;
        uint escrowAmount;
        uint depositedAmount;
        uint escrowId;
        EscrowStatus status;
    }

    Escrow[] public escrowArray;
    
    mapping (address=> mapping(uint => bool)) public consents;

    mapping (uint=>address[numberOfParties]) public parties;

	constructor(address payable addressChainAccount) payable {
        chainAccount = ChainAccount(addressChainAccount);
        owner = msg.sender;
	}

    receive() external payable {}

    event ProposedEscrow(address sender, uint escrowId);
    function proposeEscrow(address _depositor, address _beneficiary, address _arbiter, uint _escrowAmount) public {
        uint escrowId = escrowArray.length;
        Escrow memory escrow = Escrow(msg.sender, _depositor, _beneficiary, _arbiter, _escrowAmount, 0, escrowId, EscrowStatus.Proposed);
        escrowArray.push(escrow);
        parties[escrowId] = [_depositor, _beneficiary, _arbiter];
        emit ProposedEscrow(msg.sender, escrowId);
        consentToEscrow(escrowId);
    }

    function getEscrowProposal(uint escrowId) public view returns (Escrow memory) {
        return escrowArray[escrowId];
    }

    function getParties(uint escrowId) public view returns(address[numberOfParties] memory) {
        return (parties[escrowId]);
    }

    function isParty(uint escrowId) public view returns(bool) {
        for (uint i = 0; i < parties[escrowId].length; i++) {
            if (parties[escrowId][i] == msg.sender) {
                return true;
            }
        }
        return false;           
    }

    event ConsentToEscrow(address indexed sender, uint escrowId);
    event AllConsented(string message, uint escrowId);
    function consentToEscrow(uint escrowId) public {
        require(escrowArray[escrowId].status == EscrowStatus.Proposed, "Not elibible for consent");
        require(isParty(escrowId), "Only a party can consent to a proposed escrow");
        require(!consents[msg.sender][escrowId], "Consent already given");
        consents[msg.sender][escrowId] = true;
        if (allConsented(escrowId)) {
            emit AllConsented("All have consented", escrowId);
        }
        emit ConsentToEscrow(msg.sender, escrowId);
    }

    function getConsents(uint escrowId) public view returns(address[3] memory) {
        address[3] memory consentedParties;
        uint index;
        for (uint i = 0; i < parties[escrowId].length; i++) {
            if (consents[parties[escrowId][i]][escrowId] == true) {
                consentedParties[index] = parties[escrowId][i];
                index++;
            }
        }
        return consentedParties;
    }

    function allConsented(uint escrowId) public returns(bool) {
        console.log("Logging in allConsentend parties[escrowId]: ", parties[escrowId].length);
        for (uint i = 0; i < parties[escrowId].length; i++) {
            if (consents[parties[escrowId][i]][escrowId] == false) { 
                return false; 
            }
        }
        escrowArray[escrowId].status = EscrowStatus.Approved;
        return true;
    }

    function simpleTransfer(uint amount) public payable returns(bool) {
        console.log("simpleTransfer called");
        address recipient = payable(address(this));
        console.log(recipient);
        bytes memory payload = abi.encodeWithSignature("transferFunds(address,uint256)",recipient,amount);
        console.log("logging payload:");
        console.logBytes(payload);
        address chainAccountAddress = payable(address(chainAccount));
        console.log(chainAccountAddress);
        (bool success, )= chainAccountAddress.delegatecall{ gas : 30000 }(payload);
        require(success, "simple transfer failed");
        return success;
    }

    event DepositedInEscrow(address indexed _depositor, address indexed escrowContract, uint indexed amount);
    function depositInEscrow(uint escrowId, uint amount) public {
        console.log("Logging msg.sender in depositInEscrow: ", msg.sender);
        Escrow memory escrow = escrowArray[escrowId]; 
        require(msg.sender == escrow.depositor, "Only depositor can place funds in escrow");
        require(escrow.arbiter != address(0) && escrow.beneficiary != address(0), "no address for beneficiary or arbiter");
        require(escrow.status == EscrowStatus.Approved, "Escrow not yet approved");
        require(escrow.status != EscrowStatus.FullyFunded, "Escrow already fully funded");
        require((escrow.escrowAmount * 105) > ((escrow.depositedAmount + amount)*100), "Deposit exceeds escrow amount by more than 5%");
        bytes memory payload = abi.encodeWithSignature("transferFunds(address recipient, uint amount)", address(this), amount);
        console.log("Logging payload in depositInEscrow: ");
        console.logBytes(payload);
        (bool success, ) = address(chainAccount).delegatecall(payload);
        console.log("Logging success in depositInEscrow: ", success);
        if (success == true) {
            escrow.depositedAmount += amount;
             if (escrow.depositedAmount >= escrow.escrowAmount) {
                escrow.status = EscrowStatus.FullyFunded;
            }
            uint balanceOfThisContract = chainAccount.balanceOf(address(this));
            uint excessAmount = escrow.depositedAmount - escrow.escrowAmount;
            if (escrow.depositedAmount > escrow.escrowAmount && balanceOfThisContract > excessAmount) {
                chainAccount.transferFunds(msg.sender, excessAmount);
            }
            emit DepositedInEscrow(msg.sender, address(this), amount);
        } else {
            console.log("Transfer failed, logging success: ", success);
        }
    }

	event Approved(uint indexed escrowId, address indexed escrowAddress, uint indexed amountApproved);
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
		emit Approved(escrowId, address(this), approvedAmount);
        escrow.status = EscrowStatus.Executed;
	}

    event ConsentWithdrawn(address indexed sender, uint escrowId);
    function withdrawConsent(uint escrowId) public {
        require(escrowArray[escrowId].status == EscrowStatus.Proposed, "Consent cannot be withdrawn after all have approved");
        require(isParty(escrowId), "Only a party can withdraw consent");
        require(consents[msg.sender][escrowId], "No earlier consent to be withdrawn");
        consents[msg.sender][escrowId] = false;
        emit ConsentWithdrawn(msg.sender, escrowId);
    }

    event ProposalWithdrawn(address indexed sender, uint indexed escrowId);
    function withdrawProposal(uint escrowId) public {
        require(msg.sender == escrowArray[escrowId].proposer, "Only proposer can withdraw proposal");
        require(escrowArray[escrowId].status == EscrowStatus.Proposed, "Proposal cannot be cancelled after all have approved");
        escrowArray[escrowId].status = EscrowStatus.Cancelled;
        consents[msg.sender][escrowId] = false;
        emit ProposalWithdrawn(msg.sender, escrowId);
    }
}
