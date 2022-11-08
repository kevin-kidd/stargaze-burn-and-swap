import {SigningCosmWasmClient} from "@cosmjs/cosmwasm-stargate";
import {toast} from "react-toastify";
import {CONTRACTS} from "../config";
import {METADATA} from "../components/TokensCard";

const fetchMetadata = async (nftInfoResponse: { token_uri?: string, extension?: any }) => {
  if(nftInfoResponse.token_uri) {
    if(nftInfoResponse.token_uri.slice(0,7) === "ipfs://") {
      const cid = nftInfoResponse.token_uri.slice(7);
      const fetchResponse = await fetch(`https://cloudflare-ipfs.com/ipfs/${cid}`);
      const metadata = await fetchResponse.json();
      return {
        name: metadata.name,
        image: metadata.image
      }
    }
  } else if(nftInfoResponse.extension) {
    return {
      name: nftInfoResponse.extension.name,
      image: nftInfoResponse.extension.name
    }
  }
  return;
}

export const fetchInventory = async (client: SigningCosmWasmClient, address: string, type: string) => {
  let contractAddress = type === "burnable" ? CONTRACTS.burn_contract.sg721 : CONTRACTS.swap_contract.sg721;

  try {
    const tokensResponse = await client.queryContractSmart(
      contractAddress,
      {
        tokens: {
          owner: address
        }
      }
    );

    if(!tokensResponse || !tokensResponse.tokens) {
      toast.error(
        "Failed to fetch inventory!",
        {
          toastId: "fetch-inventory-" + type
        }
      )
      return;
    }

    if(tokensResponse.tokens.length === 0) {
      toast.error(
        "You do not have any NFTs!",
        {
          toastId: "fetch-inventory-" + type
        }
      );
      return
    }
    let allMetadata: METADATA[] = [];

    for(const tokenId of tokensResponse.tokens) {
      const nftInfoResponse = await client.queryContractSmart(
        contractAddress,
        {
          nft_info: {
            token_id: tokenId
          }
        }
      );
      const metadata: { name: string, image: string } | undefined = await fetchMetadata(nftInfoResponse);
      if (!metadata) {
        toast.error(
          `Failed to fetch metadata for token ID: ${tokenId}`,
          {
            toastId: "fetch-inventory-" + type
          }
        );
      } else {
        allMetadata.push({
          ...metadata,
          tokenId: tokenId
        });
      }
    }

    return allMetadata;

  } catch (error: unknown) {
    if(error instanceof Error) {
      toast.error(
        error.message,
        {
          toastId: "fetch-inventory-" + type
        }
      );
    } else {
      toast.error(
        "Failed to fetch inventory.",
        {
          toastId: "fetch-inventory-" + type
        }
      );
    }
    console.error(error);
  }
}