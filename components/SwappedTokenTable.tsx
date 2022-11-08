import {FunctionComponent, useEffect, useState} from "react";
import Image from "next/image";
import {SigningCosmWasmClient} from "@cosmjs/cosmwasm-stargate";
import {fetchInventory} from "../func/helper";
import {Circles} from "react-loading-icons";
import {METADATA} from "./TokensCard";

export const SwappedTokenTable: FunctionComponent<{
  client: SigningCosmWasmClient
  address: string
  inventoryType: string
}> = ({
  client,
  address,
  inventoryType
}) => {

  const [inventory, setInventory] = useState<METADATA[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const getInventory = async () => {
      setLoading(true);
      const inventoryResponse = await fetchInventory(client, address, "swapped");
      if(inventoryResponse) {
        setInventory(inventoryResponse)
      } else {
        setInventory([]);
      }
      setLoading(false);
    }
    if(inventoryType === "swapped") getInventory();
  }, [inventoryType]);

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-72 h-full w-full my-2">
      <table className="table w-full">
        <thead className="sticky top-0 left-0 z-20">
          <tr>
            <th>Name</th>
            <th>Token ID</th>
          </tr>
        </thead>
        <tbody>
          { inventory.length > 0 ?
            <>
              { inventory.map((metadata: METADATA) => (
                <tr key={`table-item-nft-${metadata.name}-${metadata.tokenId}`}>
                  <td>
                    <div className="flex items-center space-x-3">
                      <div className="avatar">
                        <div className="mask mask-squircle w-12 h-12 relative">
                          <Image src={`https://res.cloudinary.com/drgbtjcgt/image/fetch/${metadata.image}`} alt="Avatar" layout="fill" />
                        </div>
                      </div>
                      <a>
                        { metadata.name }
                      </a>
                    </div>
                  </td>
                  <td>
                    { metadata.tokenId }
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
  )

}