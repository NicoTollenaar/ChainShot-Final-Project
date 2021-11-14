const { ethers } = require("hardhat");

async function main() {
    const contractAddress = "0x974c07D51fC8c2f7D447bC9d6683DdA428283025";
    const [ issuerSigner, accountHolderSigner, recipientSigner ] = await ethers.getSigners();
    console.log("The three signer addresses: ", issuerSigner.address, accountHolderSigner.address, recipientSigner.address);
    const chequeContract = await ethers.getContractAt("ABNAMROchainCheque", contractAddress);
    const issuerAddress = await chequeContract.issuer();
    const accounts = await ethers.provider.listAccounts();
    const [ sameAsIssuer, accountHolderAddress, recipientAddress] = accounts;
    console.log("List accounts: ", accounts);
    const name = await chequeContract.name();
    const symbol = await chequeContract.symbol();
    const decimals = await chequeContract.decimals();
    console.log("Logging name, symbol and decimals: ", name, symbol, decimals);
    console.log("Properties of chequeContract: ", Object.keys(chequeContract));

    const txIssuance = await chequeContract.issueCheque(accountHolderAddress, 10000);
    await txIssuance.wait();

    console.log("This is txTransfer: ", txIssueCheque);
    
    const txTransfer = await chequeContract.connect(accountHolderSigner).transfer(recipientAddress, 5000);
    await txTransfer.wait();

    const txRedeem = await chequeContract.connect(recipientSigner).redeemCheque(250000);
    await txRedeem.wait();

    const txBurn = await chequeContract.burnCheque(1000);
    await txBurn.wait();

    let balanceIssuer = await chequeContract.balanceOf(issuerAddress)
    .then((result)=> result.toString()).catch((err)=>console.log(err));
    let balanceAccountHolder = await chequeContract.balanceOf(accountHolderAddress)
    .then((result)=> result.toString()).catch((err)=>console.log(err));
    let balanceRecipient = await chequeContract.balanceOf(recipientAddress)
    .then((result)=> result.toString()).catch((err)=>console.log(err));
    let totalSupply = await chequeContract.totalOutstandingCheques()
    .then((result)=> result.toString()).catch((err)=> console.log(err));
    
    console.log("This is the balance of issuer: ", balanceIssuer);
    console.log("This is the balance of accountHolder: ", balanceAccountHolder);
    console.log("This is the balance of the recipient: ", balanceRecipient);
    console.log("TotalSupply: ", totalSupply);

}

main()
.then(()=> process.exit(0))
.catch((err)=> {
    console.log(err);
    process.exit(1);
});