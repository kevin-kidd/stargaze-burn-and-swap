export const CONFIG = {
    mint_same_token_id: true, // If true, the burned token ID will match the newly minted token ID
    burn_token: false, // If true, the token will be burned. If false, the tokens will be kept in the backend's inventory
    network_details: {
        rpc_endpoint: "https://rpc.elgafar-1.stargaze-apis.com/", // The REST endpoint for connecting with Stargaze testnet
        chain_id: "elgafar-1", // The testnet chain ID
        explorer_url: "https://testnet-explorer.publicawesome.dev/stargaze/tx/", // The testnet explorer URL which is prepended to the transaction hash
        // rest_endpoint: "https://rpc.stargaze-apis.com/", // The REST endpoint for connecting with Stargaze mainnet
        // chain_id: "stargaze-1" // The mainnet chain ID
        // explorer_url: "https://mintscan.io/stargaze/txs/", // The mainnet explorer URL which is prepended to the transaction hash
    },
    backend_address: "" // The address to transfer the tokens to for burning
}

export const CONTRACTS = {
    burn_contract: {
        sg721: "", // SG-721 contract address for the collection you want to burn tokens from
        minter: "" // Minter contract address for the collection you want to burn tokens from
    },
    swap_contract: {
        sg721: "", // SG-721 contract address for the collection you are minting the new tokens from
        minter: "" // Minter contract address for the collection you are minting the new tokens from
    },
}