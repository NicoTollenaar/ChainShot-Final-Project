require("@nomiclabs/hardhat-waffle");
require('dotenv').config();
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
// module.exports = {
//   solidity: "0.8.0",
// };


module.exports = {
  solidity: "0.8.0",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      from: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" //does not work
    },
    rinkeby: {
      url: `${process.env.ALCHEMY_RINKEBY_URL}`,
      accounts: [
        `0x${process.env.RINKEBY_PRIVATE_KEY_ONE}`,
        `0x${process.env.RINKEBY_PRIVATE_KEY_TWO}`,
        `0x${process.env.RINKEBY_PRIVATE_KEY_THREE}`,
        `0x${process.env.RINKEBY_PRIVATE_KEY_FOUR}`,
      ],
    } 
  }
}









