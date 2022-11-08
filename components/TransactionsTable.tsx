import {FunctionComponent, useEffect, useState} from "react";
import setupIndexedDB, { useIndexedDBStore } from "use-indexeddb";
import {toast} from "react-toastify";
import {CONFIG} from "../config";

type TRANSACTION = {
  id?: number
  txHash?: string
  errorMessage?: string
  tokenIds: string[]
  status: string
}

export const TransactionsTable: FunctionComponent<{
  reloadTransactions: () => void
  isReloadingTransactions: boolean
  address: string
}> = ({
  reloadTransactions,
  isReloadingTransactions,
  address
}) => {

  const [isAnimated, setIsAnimated] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<TRANSACTION[]>([]);

  const idbConfig = {
    databaseName: "transactions-" + address,
    version: 1,
    stores: [
      {
        name: "transactions",
        id: { keyPath: "id", autoIncrement: true },
        indices: [
          { name: "txHash", keyPath: "txHash", options: { unique: true } },
          { name: "tokenIds", keyPath: "tokenIds" },
          { name: "status", keyPath: "status" },
        ],
      },
    ],
  };

  useEffect(() => {
    if(address) {
      setupIndexedDB(idbConfig)
        .then(() => console.log("connected to local db"))
        .catch(e => console.error("error / unsupported", e));
    }
  }, [address]);

  const { getAll, update } = useIndexedDBStore("transactions");

  useEffect(() => {
    if(getAll) {
      getAll().then((allTransactions: any) => setTransactions(allTransactions));
    }
  }, [getAll, isReloadingTransactions]);

  const retryTransaction = async (transaction: TRANSACTION) => {
    const retryToastID = toast.loading("Checking transaction...", { toastId: "retry-transaction" });

    let responseData;
    try {
      const response = await fetch(
        "/api/handle_swap",
        {
          body: JSON.stringify({
            txHash: transaction.txHash,
            tokens: transaction.tokenIds
          }),
          headers: {
            "Content-Type": "application/json; charset=utf8"
          },
          method: 'POST'
        }
      );
      responseData = await response.json();
    } catch (error: any) {
      if (error.data && error.data.error) {
        toast.update(
          retryToastID,
          {
            render: error.data.error,
            autoClose: 5000,
            isLoading: false,
            type: "error",
            toastId: "retry-transaction"
          }
        );
        await update({
          id: transaction.id,
          tokenIds: transaction.tokenIds,
          txHash: transaction.txHash,
          status: "Error",
          errorMessage: error.data.error
        });
      } else if (error instanceof Error) {
        toast.update(
          retryToastID,
          {
            render: error.message,
            autoClose: 5000,
            isLoading: false,
            type: "error",
            toastId: "retry-transaction"
          }
        );
        await update({
          id: transaction.id,
          tokenIds: transaction.tokenIds,
          txHash: transaction.txHash,
          status: "Error",
          errorMessage: error.message
        });
      } else {
        toast.update(
          retryToastID,
          {
            render: "An unexpected error occurred. Please contact support for help.",
            autoClose: 5000,
            isLoading: false,
            type: "error",
            toastId: "retry-transaction"
          }
        );
        await update({
          id: transaction.id,
          tokenIds: transaction.tokenIds,
          txHash: transaction.txHash,
          status: "Error",
          errorMessage: "An unexpected error occurred. #0002"
        });
      }
      reloadTransactions();
      console.error(error);
      return
    }

    if(responseData.message) {
      try {
        await update({
          id: transaction.id,
          tokenIds: transaction.tokenIds,
          txHash: transaction.txHash,
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
        retryToastID,
        {
          render: responseData.message,
          autoClose: 5000,
          isLoading: false,
          type: "success",
          toastId: "retry-transaction"
        }
      );
      reloadTransactions();
    } else {
      console.error(responseData);
      if(responseData.error) {
        toast.update(
          retryToastID,
          {
            render: responseData.error,
            autoClose: 5000,
            isLoading: false,
            type: "error",
            toastId: "retry-transaction"
          }
        );
      } else {
        toast.update(
          retryToastID,
          {
            render: "An unexpected error occurred. #0005",
            autoClose: 5000,
            isLoading: false,
            type: "error",
            toastId: "retry-transaction"
          }
        );
      }

    }
  }

  if(transactions.length > 0) {
    return (
      <div className="rounded-box w-full max-w-2xl bg-slate-600 mx-auto p-10 my-10 flex flex-col items-center">
        <h1 className="w-full text-center mb-6 text-white text-xl">Transaction History</h1>
        <div className="overflow-x-hidden overflow-y-auto max-h-72 h-full w-full my-2">
          <table className="table w-full table-fixed">
            <thead className="sticky top-0 left-0 z-20">
            <tr>
              <th className="w-20">Status</th>
              <th className="w-40">Token IDs</th>
              <th className="relative">
                Tx Hash
                <div className="absolute right-4 top-3 text-white hover:cursor-pointer"
                     onClick={() => {
                      reloadTransactions()
                      setIsAnimated(true)
                      }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                       stroke="currentColor" onAnimationEnd={() => setIsAnimated(false)}
                       className={`w-6 h-6 ${ isAnimated && "animate-spin-slow" }`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
                  </svg>
                </div>
              </th>
            </tr>
            </thead>
            <tbody>
              { transactions.map((transaction: TRANSACTION) => (
                <tr key={`table-item-nft-${transaction.txHash}`}>
                  <td className="text-xl text-center">
                    {
                      transaction.status === "Success" ?
                        <>✅</>
                        :
                        (
                          transaction.status === "Error" ?
                            <div className="flex items-center gap-x-2">
                              <div className="tooltip tooltip-error z-30 tooltip-right hover:cursor-default" data-tip={`${transaction.errorMessage ?? "An unexpected error occurred."}`}>
                                🔴
                              </div>
                              <div className="tooltip tooltip-info z-20 tooltip-right hover:cursor-pointer" data-tip="Retry transaction" onClick={() => retryTransaction(transaction)}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-4 h-4 fill-white">
                                  <path d="M500.33 0h-47.41a12 12 0 0 0-12 12.57l4 82.76A247.42 247.42 0 0 0 256 8C119.34 8 7.9 119.53 8 256.19 8.1 393.07 119.1 504 256 504a247.1 247.1 0 0 0 166.18-63.91 12 12 0 0 0 .48-17.43l-34-34a12 12 0 0 0-16.38-.55A176 176 0 1 1 402.1 157.8l-101.53-4.87a12 12 0 0 0-12.57 12v47.41a12 12 0 0 0 12 12h200.33a12 12 0 0 0 12-12V12a12 12 0 0 0-12-12z" />
                                </svg>
                              </div>
                            </div>
                            :
                            <>🟡</>
                        )

                    }
                  </td>
                  <td className="truncate">
                    { transaction.tokenIds.toString() }
                  </td>
                  <td className="truncate">
                    <a
                      href={`${CONFIG.network_details.explorer_url}${transaction.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent"
                    >
                      { transaction.txHash ?? "N/A" }
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return <></>;

}