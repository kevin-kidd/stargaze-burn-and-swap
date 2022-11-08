import {ChangeEvent, FunctionComponent, useState} from "react";
import {BurnTokenTable} from "./BurnTokenTable";
import {SwappedTokenTable} from "./SwappedTokenTable";
import {SigningCosmWasmClient} from "@cosmjs/cosmwasm-stargate";

export type METADATA = {
  name: string
  image: string
  tokenId: string
}

export const TokensCard: FunctionComponent<{
  client: SigningCosmWasmClient
  address: string
}> = ({
  client,
  address
}) => {

  const [inventoryType, setInventoryType] = useState<string>("burnable");

  return (
    <>
      <h4 className="text-white font-semibold text-lg">Instructions</h4>
      <p className="text-gray-200">Select some tokens to burn and swap.</p>

      <div className="flex justify-end items-center w-full gap-x-2 mt-4">
        <input type="checkbox" className="toggle toggle-accent" checked={inventoryType === "burnable"}
               onChange={(e: ChangeEvent<HTMLInputElement>) => {
                 if(e.target.checked) {
                   setInventoryType("burnable");
                 } else {
                   setInventoryType("swapped");
                 }
               }}
        />
        <span className="text-white text-lg font-semibold">
          { inventoryType === "burnable" ? "Wave 1" : "Wave 2" }
        </span>
      </div>
      {
        inventoryType === "burnable" ?
          <BurnTokenTable client={client} address={address} inventoryType={inventoryType} setInventoryType={setInventoryType} />
          :
          <SwappedTokenTable client={client} address={address} inventoryType={inventoryType} />
      }
    </>
  )
}