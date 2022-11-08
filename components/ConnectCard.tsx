import {Dispatch, FunctionComponent, SetStateAction} from "react";
import {SigningCosmWasmClient} from "@cosmjs/cosmwasm-stargate";
import {toast} from "react-toastify";
import {CONFIG} from "../config";
import {GasPrice} from "@cosmjs/stargate";


export const ConnectCard: FunctionComponent<{
  setClient: Dispatch<SetStateAction<SigningCosmWasmClient | undefined>>
  setAddress: Dispatch<SetStateAction<string>>
}> = ({
  setClient,
  setAddress
}) => {

  const connect = async () => {
    let client: SigningCosmWasmClient;
    if (!window.keplr) {
      toast.error("Unable to detect the Keplr extension.");
      return
    }

    try {
      await window.keplr.enable(CONFIG.network_details.chain_id)
    } catch (error) {
      console.error(error);
      toast.error(`Unable to connect to the chain: ${CONFIG.network_details.chain_id}`);
      return
    }

    try {
      const offlineSigner = await window.keplr.getOfflineSignerAuto(CONFIG.network_details.chain_id);
      const accounts = await offlineSigner.getAccounts();
      client = await SigningCosmWasmClient.connectWithSigner(
        CONFIG.network_details.rpc_endpoint,
        offlineSigner,
        {
          prefix: "wasm",
          gasPrice: GasPrice.fromString("0ustars")
        }
      );
      setAddress(accounts[0].address);
      setClient(client);
    } catch (error: unknown) {
      if(error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Unexpected error occured.");
      }
      console.error(error);
    }
  }

  return (
    <>
      <h4 className="text-white font-semibold text-lg">Instructions</h4>
      <p className="text-gray-200">Connect to Keplr to continue.</p>
      <button onClick={connect} className="btn btn-accent mt-4 w-3/4">
        Connect Wallet
      </button>
    </>
  )
}