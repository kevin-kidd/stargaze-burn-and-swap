import {ChangeEvent, Dispatch, FunctionComponent, SetStateAction, useEffect, useState} from "react";
import Image from "next/image";
import {MsgExecuteContractEncodeObject, SigningCosmWasmClient} from "@cosmjs/cosmwasm-stargate";
import {fetchInventory} from "../func/helper";
import { Circles } from "react-loading-icons";
import {METADATA} from "./TokensCard";
import {toast} from "react-toastify";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { toUtf8 } from '@cosmjs/encoding';
import {CONFIG, CONTRACTS} from "../config";

export const BurnTokenTable: FunctionComponent<{
  client: SigningCosmWasmClient
  address: string
  inventoryType: string
  setInventoryType: Dispatch<SetStateAction<string>>
}> = ({
  client,
  address,
  inventoryType,
  setInventoryType
}) => {

  const [inventory, setInventory] = useState<METADATA[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [burning, setBurning] = useState<boolean>(false);
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);

  useEffect(() => {
    const getInventory = async () => {
      setLoading(true);
      const inventoryResponse = await fetchInventory(client, address, "burnable");
      if(inventoryResponse) {
        setInventory(inventoryResponse)
      } else {
        setInventory([]);
      }
      setLoading(false);
    }
    if(inventoryType === "burnable") getInventory();
  }, [inventoryType]);

  const burnTokens = async () => {
    setBurning(true);
    const burningToastID = toast.loading(
      "Burning...",
      {
        toastId: "burning"
      }
    )
    try {
      const transferMsgs: MsgExecuteContractEncodeObject[] = [];
      for(const tokenId of selectedTokens) {
        transferMsgs.push({
            typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
            value: MsgExecuteContract.fromPartial({
              sender: address,
              contract: CONTRACTS.burn_contract.sg721,
              msg: toUtf8(
                JSON.stringify({
                  transfer_nft: {
                    recipient: CONFIG.backend_address,
                    token_id: tokenId
                  }
                })
              )
            })
        })
      }

      const transferTx = await client.signAndBroadcast(
        address,
        transferMsgs,
        'auto',
        'Burn & Swap by @KevinAKidd - https://github.com/kevinakidd'
      );

      if(transferTx.code !== 0) {
        console.error(transferTx);
        toast.update(
          burningToastID,
          {
            render: "Transaction failed.",
            autoClose: 5000,
            isLoading: false,
            type: "error",
            toastId: "burning"
          }
        );
        return;
      }

      if(!transferTx.transactionHash) {
        console.error(transferTx);
        toast.update(
          burningToastID,
          {
            render: "Unable to fetch transaction hash. Please contact support for help.",
            autoClose: 5000,
            isLoading: false,
            type: "error",
            toastId: "burning"
          }
        );
        return;
      }

      const response = await fetch(
        "/api/handle_swap",
        {
          body: JSON.stringify({
            txHash: transferTx.transactionHash,
            tokens: selectedTokens
          }),
          headers: {
            "Content-Type": "application/json; charset=utf8"
          },
          method: 'POST'
        }
      );

      const responseData = await response.json();

      if(responseData.message) {
        // update localstorage -- TODO
        toast.update(
          burningToastID,
          {
            render: responseData.message,
            autoClose: 5000,
            isLoading: false,
            type: "success",
            toastId: "burning"
          }
        );
        setInventoryType("swapped");
        return;
      } else if(responseData.error) {
        console.error(responseData.error);
        toast.update(
          burningToastID,
          {
            render: responseData.error,
            autoClose: 5000,
            isLoading: false,
            type: "error",
            toastId: "burning"
          }
        );
      } else {
        console.error(responseData);
        toast.update(
          burningToastID,
          {
            render: "An unexpected error occurred.",
            autoClose: 5000,
            isLoading: false,
            type: "error",
            toastId: "burning"
          }
        );
      }
    } catch (error: unknown | any) {
      if(error instanceof Error) {
        toast.update(
          burningToastID,
          {
            render: error.message,
            autoClose: 5000,
            isLoading: false,
            type: "error",
            toastId: "burning"
          }
        );
        return
      } else {
        if(error.data && error.data.error) {
          toast.update(
            burningToastID,
            {
              render: error.data.error,
              autoClose: 5000,
              isLoading: false,
              type: "error",
              toastId: "burning"
            }
          );
          return
        }
      }
      console.error(error);
    }
  toast.update(
    burningToastID,
    {
      render: "An unexpected error occurred.",
      autoClose: 5000,
      isLoading: false,
      type: "error",
      toastId: "burning"
    }
  );
    setBurning(false);
  }

  return (
    <>
      <div className="overflow-x-auto overflow-y-auto max-h-72 h-full w-full my-2">
        <table className="table w-full">
          <thead className="sticky top-0 left-0 z-20">
            <tr>
              <th>
                <label>
                  <input type="checkbox" className="checkbox"
                         onChange={(e: ChangeEvent<HTMLInputElement>) => {
                           if(e.target.checked) {
                             setSelectedTokens(inventory.map((metadata: METADATA) => metadata.tokenId));
                           } else {
                             setSelectedTokens([]);
                           }
                         }}
                  />
                </label>
              </th>
              <th>Name</th>
              <th>Token ID</th>
            </tr>
          </thead>
          <tbody>
            { inventory.length > 0 ?
              <>
                { inventory.map((metadata: METADATA) => (
                  <tr key={`table-item-nft-${metadata.name}-${metadata.tokenId}`}>
                    <th>
                      <label>
                        <input type="checkbox" className="checkbox"
                               checked={selectedTokens.some((tokenId) => tokenId === metadata.tokenId)}
                               onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                 if (e.target.checked) {
                                   setSelectedTokens([...selectedTokens, metadata.tokenId]);
                                 } else {
                                   setSelectedTokens(selectedTokens.filter((tokenId) => tokenId !== metadata.tokenId));
                                 }
                               }}
                        />
                      </label>
                    </th>
                    <td>
                      <div className="flex items-center space-x-3">
                        <div className="avatar">
                          <div className="mask mask-squircle w-12 h-12 relative">
                            <Image src={`https://res.cloudinary.com/drgbtjcgt/image/fetch/${metadata.image}`}
                                   alt="Avatar" layout="fill"/>
                          </div>
                        </div>
                        <a>
                          {metadata.name}
                        </a>
                      </div>
                    </td>
                    <td>
                      {metadata.tokenId}
                    </td>
                  </tr>
                ))}
              </>
              :
              <tr>
                <td colSpan={3}>
                  { loading ?
                    <div className="w-full flex justify-center items-center py-10">
                      <Circles />
                    </div>
                    :
                    <h1 className="text-white text-xl w-full text-center">You do not have any NFTs :(</h1>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <button onClick={burnTokens} className="btn btn-accent mt-4 w-3/4" disabled={!inventory || inventory.length === 0 || burning}>
        Burn Tokens
      </button>
    </>
  )
}