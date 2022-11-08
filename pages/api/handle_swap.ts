// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import {DirectSecp256k1HdWallet} from "@cosmjs/proto-signing";
import {MsgExecuteContractEncodeObject, SigningCosmWasmClient} from "@cosmjs/cosmwasm-stargate";
import {CONFIG, CONTRACTS} from "../../config";
import {GasPrice} from "@cosmjs/stargate";
import {AccountData} from "@cosmjs/amino";
import {toUtf8} from "@cosmjs/encoding";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";

const requestHandler = async (req: NextApiRequest, res: NextApiResponse) => {

  if(!req.body.tokens) {
    return res.status(500).json({
      error: "You did not include a list of token IDs."
    });
  }

  if(!req.body.txHash) {
    return res.status(500).json({
      error: "You did not include a transaction hash for the transfer."
    });
  }

  if(!process.env.MNEMONIC) {
    console.error("MNEMONIC NOT FOUND!");
    return;
  }
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(process.env.MNEMONIC, {
    prefix: 'stars',
  });
  let accounts: readonly AccountData[] = await wallet.getAccounts();
  const client = await SigningCosmWasmClient.connectWithSigner(
    CONFIG.network_details.rpc_endpoint,
    wallet,
    {
      gasPrice: GasPrice.fromString('0ustars')
    }
  );
  if(!client) {
    return res.status(500).json({
      error: "Failed to connect with the Stargaze network."
    });
  }

  const inventoryResponse = await client.queryContractSmart(
    CONTRACTS.burn_contract.sg721,
    {
      tokens: {
        owner: accounts[0].address
      }
    }
  );

  if(!inventoryResponse || !inventoryResponse.tokens) {
    return res.status(500).json({
      error: "Failed to check if the tokens were transferred."
    });
  }

  for(const token of req.body.tokens) {
    if(!inventoryResponse.tokens.some((tokenId: string) => tokenId === token)) {
      return res.status(500).json({
        error: `Did not find token: ${token} in the backend's inventory.`
      });
    }
  }

  let recipient: string | null = null;

  // Check TX hash and determine recipient address

  const txHashResponse = await client.getTx(req.body.txHash);
  if(!txHashResponse || !txHashResponse.events) {
    console.error(txHashResponse);
    return res.status(500).json({
      error: "Failed to fetch details from the txHash!"
    });
  }

  txHashResponse.events.forEach((event: any) => {
    const senderAttribute = event.attributes.find((attribute: any) => attribute.key === "sender");
    if(senderAttribute) recipient = senderAttribute.value;
  });

  if(recipient === null) {
    console.error(txHashResponse);
    return res.status(500).json({
      error: "Failed to fetch recipient address from the txHash!"
    });
  }

  const burnMsg = (tokenId: string): MsgExecuteContractEncodeObject => {
    return {
      typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
      value: MsgExecuteContract.fromPartial({
        sender: CONFIG.backend_address,
        contract: CONTRACTS.burn_contract.sg721,
        msg: toUtf8(
          JSON.stringify({
            burn: {
              token_id: tokenId
            }
          })
        )
      })
    }
  }

  const mintMsg = (tokenId: string | undefined): MsgExecuteContractEncodeObject => {
    if(tokenId) {
      return {
        typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
        value: MsgExecuteContract.fromPartial({
          sender: CONFIG.backend_address,
          contract: CONTRACTS.swap_contract.minter,
          msg: toUtf8(
            JSON.stringify({
              mint_for: {
                token_id: Number(tokenId),
                recipient: recipient
              },
            })
          )
        })
      }
    } else {
      return {
        typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
        value: MsgExecuteContract.fromPartial({
          sender: CONFIG.backend_address,
          contract: CONTRACTS.swap_contract.minter,
          msg: toUtf8(
            JSON.stringify({
              mint_to: {
                recipient: recipient
              }
            })
          )
        })
      }
    }
  }

  const burnMsgs: MsgExecuteContractEncodeObject[] = [];
  const mintMsgs: MsgExecuteContractEncodeObject[] = [];

  for(const token of req.body.tokens) {
    if(CONFIG.burn_token) {
      burnMsgs.push(burnMsg(token));
    }
    if(CONFIG.mint_same_token_id) {
      mintMsgs.push(mintMsg(token));
    } else {
      mintMsgs.push(mintMsg(undefined));
    }
  }

  try {
    const response = await client.signAndBroadcast(
      accounts[0].address,
      [...burnMsgs, ...mintMsgs],
      'auto',
      'Burn & Swap -- Made by @KevinK https://github.com/kevinakidd'
    );
    if(response.code === 0) {
      return res.status(200).json({
        message: "Success!"
      });
    } else {
      console.error(response);
      return res.status(500).json({
        error: response
      });
    }

  } catch (error: unknown) {
    if(error instanceof Error) {
      return res.status(500).json({
        error: error.message
      });
    }
    console.error(error);
  }
}

export default requestHandler;