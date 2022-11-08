import Head from 'next/head'
import {NextPage} from "next";
import {useState} from "react";
import { Window as KeplrWindow } from "@keplr-wallet/types";
import {SigningCosmWasmClient} from "@cosmjs/cosmwasm-stargate";
import {ToastContainer} from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import {ConnectCard} from "../components/ConnectCard";
import {TokensCard} from "../components/TokensCard";

declare global {
  interface Window extends KeplrWindow {}
}

const Home: NextPage = () => {
  const [client, setClient] = useState<SigningCosmWasmClient | undefined>();
  const [address, setAddress] = useState<string>("");

  return (
    <div>
      <Head>
        <title>SG-721 Swap & Burn</title>
        <meta name="description" content="Burn your SG-721 token and receive a brand new SG-721 token in return." />
      </Head>
      <main>
        <div className="flex flex-col w-full justify-center items-center pt-10">
            <h1 className="text-white font-semibold text-4xl">
                Burn & Swap
            </h1>
            <div className="rounded-box w-full max-w-xl bg-slate-600 mx-auto p-10 mt-10 flex flex-col items-center">
              {
                client ?
                  <TokensCard client={client} address={address} />
                  :
                  <ConnectCard setAddress={setAddress} setClient={setClient} />
              }
            </div>
        </div>
        <ToastContainer
          position="top-right"
          newestOnTop={true}
          autoClose={5000}
          hideProgressBar={false}
          closeOnClick
          draggable
          theme="dark"
        />
      </main>
    </div>
  )
}

export default Home;