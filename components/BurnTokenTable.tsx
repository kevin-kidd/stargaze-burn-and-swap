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
import {useIndexedDBStore} from "use-indexeddb";

export const BurnTokenTable: FunctionComponent<{
  client: SigningCosmWasmClient
  address: string
  inventoryType: string
  setInventoryType: Dispatch<SetStateAction<string>>
  reloadTransactions: () => void
}> = ({
  client,
  address,
  inventoryType,
  setInventoryType,
  reloadTransactions
}) => {

  const [inventory, setInventory] = useState<METADATA[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [burning, setBurning] = useState<boolean>(false);
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);

  const { add, deleteByID, update } = useIndexedDBStore("transactions");

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

  const burnAndSwapTokens = async () => {
    setBurning(true);
    const burningToastID = toast.loading(
      "Burning...",
      {
        toastId: "burning"
      }
    );

    let databaseIndex: number;
    try {
      databaseIndex = await add({ status: "Initiated", tokenIds: selectedTokens })
    } catch (error: unknown) {
      console.error(error);
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
      } else {
        toast.update(
          burningToastID,
          {
            render: "Failed to add transaction to localdb. Try a different browser.",
            autoClose: 5000,
            isLoading: false,
            type: "error",
            toastId: "burning"
          }
        );
      }
      return
    }

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

    let transferTx;

    try {
      transferTx = await client.signAndBroadcast(
        address,
        transferMsgs,
        'auto',
        'Burn & Swap by @KevinAKidd - https://github.com/kevinakidd'
      );
    } catch (error: unknown) {
      console.error(error);
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
        if(error.message.includes("Request rejected")) {
          await deleteByID(databaseIndex);
          return;
        }
        await update({
          id: databaseIndex,
          tokenIds: selectedTokens,
          status: "Error",
          errorMessage: error.message
        });
      } else {
        toast.update(
          burningToastID,
          {
            render: "An unexpected error occurred. Please contact support for help.",
            autoClose: 5000,
            isLoading: false,
            type: "error",
            toastId: "burning"
          }
        );
        await update({
          id: databaseIndex,
          tokenIds: selectedTokens,
          status: "Error",
          errorMessage: "An unexpected error occurred. #0001"
        });
      }
      reloadTransactions();
      return;
    }

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
      await update({
        id: databaseIndex,
        tokenIds: selectedTokens,
        status: "Error",
        errorMessage: "Transaction failed."
      });
      reloadTransactions();
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
      await update({
        id: databaseIndex,
        tokenIds: selectedTokens,
        status: "Error",
        errorMessage: "Unable to fetch transaction hash. Please contact support for help."
      });
      reloadTransactions();
      return;
    }

    try {
      await update({
        id: databaseIndex,
        tokenIds: selectedTokens,
        txHash: transferTx.transactionHash,
        status: "Processing"
      });
    } catch (error: any) {
      toast.error(
        "Failed to add txHash to localdb: " + transferTx.transactionHash,
        {
          type: "info",
        }
      );
      console.error(error);
    }

    let responseData;
    try {
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
      responseData = await response.json();
    } catch (error: any) {
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
        await update({
          id: databaseIndex,
          tokenIds: selectedTokens,
          txHash: transferTx.transactionHash,
          status: "Error",
          errorMessage: error.data.error
        });
      } else if(error instanceof Error) {
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
        await update({
          id: databaseIndex,
          tokenIds: selectedTokens,
          txHash: transferTx.transactionHash,
          status: "Error",
          errorMessage: error.message
        });
      } else {
        toast.update(
          burningToastID,
          {
            render: "An unexpected error occurred. Please contact support for help.",
            autoClose: 5000,
            isLoading: false,
            type: "error",
            toastId: "burning"
          }
        );
        await update({
          id: databaseIndex,
          tokenIds: selectedTokens,
          txHash: transferTx.transactionHash,
          status: "Error",
          errorMessage: "An unexpected error occurred. #0002"
        });
      }
      reloadTransactions();
      setBurning(false);
      return;
    }

    if(responseData.message) {

      try {
        await update({
          id: databaseIndex,
          tokenIds: selectedTokens,
          txHash: transferTx.transactionHash,
          status: "Success"
        });
      } catch (error: any) {
        toast.error(
          "Failed to update the transaction status in localdb.",
          {
            type: "info",
          }
        );
        console.error(error);
      }

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
      reloadTransactions();
      setBurning(false);
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
      await update({
        id: databaseIndex,
        tokenIds: selectedTokens,
        txHash: transferTx.transactionHash,
        status: "Error",
        errorMessage: responseData.error
      });
      setBurning(false);
      reloadTransactions();
      return;
    } else {
      console.error(responseData);
      toast.update(
        burningToastID,
        {
          render: "An unexpected error occurred. Please contact support for help.",
          autoClose: 5000,
          isLoading: false,
          type: "error",
          toastId: "burning"
        }
      );
    }
    await update({
      id: databaseIndex,
      tokenIds: selectedTokens,
      txHash: transferTx.transactionHash,
      status: "Error",
      errorMessage: "An unexpected error occurred. #0003"
    });
    reloadTransactions();
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
      <button onClick={burnAndSwapTokens} className="btn btn-accent mt-4 w-3/4" disabled={!inventory || inventory.length === 0 || burning}>
        Burn Tokens
      </button>
    </>
  )
}