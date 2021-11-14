# Basic draft contract for the creation, transfer and redemption of a digital cheque

Notes:

# Used terms:

1. accountHolder – customer of the bank drawing a cheque
2. recipient – the payee (the party to receive the cheque from the accountholder)
3. issuer – the bank of the accountholder, issuer of the cheque
4. thirdParty – a party other than one of the above
5. Agent - may be needed for legal reasons for the escrow contract
6. Name of contract: ABNAMROchainChequeDollars (BANKOFAMERICAchainChequeEuros)
7. Symbol: $-CHQ-ABN (currency - cheque - issuing bank), EUR-CHQ-BOA


# Main steps

1. accountHolder requests the issuer to issue a cheque through an off-chain request
2. the issuer mints a cheque (to itself) and then transfers the newly minted cheque to the accountholder  
3. the accountholder can transfer the cheque balance (or a portion thereof) to the recipient
5. the recipient can redeem the cheque balance by transferring it back to the bank that issued the cheque	
6.	Upon redemption the bank transfers the indicated funds to an account designated by the recipient or issues one or more new cheques to the recipient 
7. Instead of redeeming the cheque, the recipient can also transfer (portions of) the cheque balance to one or more third parties. These third parties can then either redeem the cheque or transfer it on in the same way. The cheque balance has essentially become a form of cash
8.	The issuer can burn cheque balances that it holds itself

# Remarks / questions

1. this draft assumes that a bank deploys one cheque contract per currency
2. I have duplicated certain standard functions that exist in an ERC20 token to make them visible (for my own ease / learning). These functions can be overridden
3. still need to figure out how best to make a transfer subject to a smart contract 
4. Use safeERC?
5. Use ERC Pausable?
6. Use ERC 777?
7. Currency to be specified (symbol in in ERC20 constructor sufficient?)
8. Consider to have the escrow and related contracts deployed by a foundation (for legal reasons)

