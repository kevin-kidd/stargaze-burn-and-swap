## Description
This is a simple burn-and-swap dApp which is intended to be a proof of concept for a future project. Using this, your holders can burn their NFTs in return for a newly minted NFT from a separate collection on the [Stargaze blockchain](https://stargaze.zone).

### Instructions

- Modify `config.example.js` and rename it to `config.js` when complete.
- Set the contract addresses for both your collections.
  - The burn contract is the collection in which your holders will be burning their NFTs (wave 1)
  - The swap contract is the collection which you will be minting new tokens from (wave 2)
- Add your backend wallet's mnemonic to `.env.example` and rename it to `.env.local`
  - This wallet must be the admin address with minting privileges on your swap collection (wave 2)
- Enable or disable burning in the config file. If disabled, the backend will collect the NFTs instead of burning them.
- Choose whether to mint the same token ID in the config file. If enabled, holders will receive an NFT from the wave 2 collection with matching token IDs from their burned wave 1 NFTs.

### Usage

- Run `yarn install` to install the package dependencies
- Run `yarn dev` to start the dev environment