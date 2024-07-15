/* eslint-disable @next/next/no-img-element */
"use client";

import { ccc } from "@ckb-ccc/connector-react";
import React, { ReactNode, useEffect, useState } from "react";
import { common } from "@ckb-lumos/common-scripts";
import { Cell, CellDep, Script, config } from "@ckb-lumos/lumos"
import { bytes, BytesLike, Uint128 } from "@ckb-lumos/lumos/codec"
import { TransactionSkeleton, addressToScript } from "@ckb-lumos/helpers";
import { Indexer } from "@ckb-lumos/ckb-indexer";
import { ScriptConfig, predefined } from "@ckb-lumos/config-manager";
import { registerCustomLockScriptInfos } from "@ckb-lumos/common-scripts/lib/common";
import { generateDefaultScriptInfos } from "@ckb-ccc/lumos-patches";
import Link from "next/link";
import { addCellDep } from "@ckb-lumos/lumos/helpers";

function WalletIcon({
  wallet,
  className,
}: {
  wallet: ccc.Wallet;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={wallet.icon}
      alt={wallet.name}
      className={`h-8 w-8 rounded-full ${className}`}
    />
  );
}

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`flex items-center rounded-full bg-black px-5 py-3 text-white ${props.className}`}
    />
  );
}

function Sign() {
  const signer = ccc.useSigner();
  const [messageToSign, setMessageToSign] = useState<string>("");
  const [signature, setSignature] = useState<string>("");
  const [isValid, setIsValid] = useState<boolean | undefined>(undefined);

  return (
    <>
      {signature !== "" ? (
        <>
          <p className="mb-1">Signature</p>
          <p className="mb-1 w-full whitespace-normal text-balance break-all text-center">
            {signature}
          </p>
          {isValid !== undefined ? (
            <p className="mb-1">{isValid ? "Valid" : "Invalid"}</p>
          ) : null}
        </>
      ) : null}
      <div className="mb-1 flex flex-col items-center">
        <input
          className="mb-1 rounded-full border border-black px-4 py-2"
          type="text"
          value={messageToSign}
          onInput={(e) => setMessageToSign(e.currentTarget.value)}
          placeholder="Message to sign and verify"
        />
        <div className="flex">
          <Button
            onClick={async () => {
              if (!signer) {
                return;
              }
              setSignature(
                JSON.stringify(await signer.signMessage(messageToSign)),
              );
              setIsValid(undefined);
            }}
          >
            Sign
          </Button>
          <Button
            className="ml-2"
            onClick={async () => {
              setIsValid(
                await ccc.Signer.verifyMessage(
                  messageToSign,
                  JSON.parse(signature),
                ),
              );
            }}
          >
            Verify
          </Button>
        </div>
      </div>
    </>
  );
}

function Transfer() {
  const signer = ccc.useSigner();
  const [transferTo, setTransferTo] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [hash, setHash] = useState<string>("");
  const [data, setData] = useState<string>("");

  return (
    <>
      {hash !== "" ? (
        <p className="mb-1 w-full whitespace-normal text-balance break-all text-center">
          {hash}
        </p>
      ) : (
        <></>
      )}
      <div className="mb-1 flex flex-col items-center">
        <div className="flex flex-col">
          <input
            className="rounded-full border border-black px-4 py-2"
            type="text"
            value={transferTo}
            onInput={(e) => setTransferTo(e.currentTarget.value)}
            placeholder="Address to transfer to"
          />
          <input
            className="mt-1 rounded-full border border-black px-4 py-2"
            type="text"
            value={amount}
            onInput={(e) => setAmount(e.currentTarget.value)}
            placeholder="Amount to transfer"
          />
          <textarea
            className="mt-1 rounded-3xl border border-black px-4 py-2"
            value={data}
            onInput={(e) => setData(e.currentTarget.value)}
            placeholder="Data in the cell. Hex string will be parsed."
          />
        </div>
        <Button
          className="mt-1"
          onClick={async () => {
            if (!signer) {
              return;
            }
            // Verify destination address
            await ccc.Address.fromString(transferTo, signer.client);

            const fromAddresses = await signer.getAddresses();
            // === Composing transaction with Lumos ===
            registerCustomLockScriptInfos(generateDefaultScriptInfos());
            const indexer = new Indexer(signer.client.url);
            let txSkeleton = new TransactionSkeleton({
              cellProvider: indexer,
            });
            txSkeleton = await common.transfer(
              txSkeleton,
              fromAddresses,
              transferTo,
              ccc.fixedPointFrom(amount),
              undefined,
              undefined,
              {
                config:
                  signer.client.addressPrefix === "ckb"
                    ? predefined.LINA
                    : predefined.AGGRON4,
              },
            );
            txSkeleton = await common.payFeeByFeeRate(
              txSkeleton,
              fromAddresses,
              BigInt(3600),
              undefined,
              {
                config:
                  signer.client.addressPrefix === "ckb"
                    ? predefined.LINA
                    : predefined.AGGRON4,
              },
            );
            // ======

            const tx = ccc.Transaction.fromLumosSkeleton(txSkeleton);

            // CCC transactions are easy to be edited
            // const dataBytes = (() => {
            //   try {
            //     return ccc.bytesFrom(data);
            //   } catch (e) {}

            //   return ccc.bytesFrom(data, "utf8");
            // })();
            // if (tx.outputs[0].capacity < ccc.fixedPointFrom(dataBytes.length)) {
            //   throw new Error("Insufficient capacity to store data");
            // }
            // tx.outputsData[0] = ccc.hexFrom(dataBytes);

            // Sign and send the transaction
            setHash(await signer.sendTransaction(tx));
          }}
        >
          Transfer
        </Button>
        <Button
          className="mt-1"
          onClick={async () => {
            if (!signer) {
              return;
            }
            const { XUDT } = config.TESTNET.SCRIPTS
            // a helper to create a Script from a ScriptConfig
            function createScript(config: ScriptConfig, args: BytesLike): Script {
              return { codeHash: config.CODE_HASH, hashType: config.HASH_TYPE, args: bytes.hexify(args) }
            }
            function createCellDep(config: ScriptConfig): CellDep {
              return { depType: config.DEP_TYPE, outPoint: { txHash: config.TX_HASH, index: config.INDEX } }
            }
            // Verify destination address
            await ccc.Address.fromString(transferTo, signer.client);
            const fromAddresses = await signer.getAddresses();
            const ownerLockScript = addressToScript(fromAddresses[0], { config: config.TESTNET });
            // === Composing transaction with Lumos ===
            registerCustomLockScriptInfos(generateDefaultScriptInfos());
            const indexer = new Indexer(signer.client.url);
            const xudtTypeScript = createScript(XUDT, '0x27a1ed4bef644d7ff2eb28b7d94875724fbf7b90c9911a866d91f880c148825b')
            const xudtCollector = indexer.collector({ type: xudtTypeScript, lock: ownerLockScript })

            let transferCell: Cell | undefined
          
            for await (const cell of xudtCollector.collect()) {
              transferCell = cell
              // Collect only one (assuming you have only one minted xUDT cell).
              break
            }
            console.log(transferCell);
          
            if (!transferCell) {
              throw new Error("Owner do not have an xUDT cell yet, please call mint first")
            }
          
            let txSkeleton = TransactionSkeleton({ cellProvider : indexer })
          
            txSkeleton = addCellDep(txSkeleton, createCellDep(XUDT))
          
            txSkeleton = await common.setupInputCell(txSkeleton, transferCell, fromAddresses[0], { config: config.TESTNET })
          
            const toLock = addressToScript(transferTo, { config: config.TESTNET })
            // 实际转出的 xUDT cell
            txSkeleton = txSkeleton.update("outputs", (outputs) =>
              outputs.update(0, (cell) => ({ ...cell!, cellOutput: { ...cell!.cellOutput, lock: toLock } ,  data: bytes.hexify(Uint128.pack(ccc.fixedPointFrom(amount, 18))), }))
            )
            // 找零的 xUDT cell
            txSkeleton = txSkeleton.update("outputs", (outputs) =>
              outputs.update(1, (cell) => ({ ...transferCell, data: bytes.hexify(Uint128.pack(ccc.fixedPointFrom('5', 18) - ccc.fixedPointFrom(amount, 18))) }))
            )
          
            txSkeleton = await common.payFeeByFeeRate(
              txSkeleton,
              fromAddresses,
              BigInt(3600),
              undefined,
              {
                config:
                  signer.client.addressPrefix === "ckb"
                    ? predefined.LINA
                    : predefined.AGGRON4,
              },
            );

            const tx = ccc.Transaction.fromLumosSkeleton(txSkeleton);

            // Sign and send the transaction
            setHash(await signer.sendTransaction(tx));
          }}
        >
          Transfer xUDT
        </Button>
      </div>
    </>
  );
}

export default function Home() {
  const [error, setError] = useState<string | undefined>(undefined);
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const { name, message, stack, cause } = event.reason as Error;
      setError(JSON.stringify({ name, message, stack, cause }));
    };

    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  const { wallet, open, setClient } = ccc.useCcc();
  const signer = ccc.useSigner();

  const [internalAddress, setInternalAddress] = useState("");
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState(ccc.Zero);
  const [isTestnet] = useState(true);
  const [tab, setTab] = useState("Sign");
  const tabs: [string, ReactNode][] = [
    ["Sign", <Sign key="Sign" />],
    ["Transfer", <Transfer key="Transfer" />],
  ];

  useEffect(() => {
    if (!signer) {
      setInternalAddress("");
      setAddress("");
      return;
    }

    (async () => {
      setInternalAddress(await signer.getInternalAddress());
      setAddress(await signer.getRecommendedAddress());
      setBalance(await signer.getBalance());
    })();
  }, [signer]);

  useEffect(() => {
    setClient(
      isTestnet ? new ccc.ClientPublicTestnet() : new ccc.ClientPublicMainnet(),
    );
  }, [isTestnet, setClient]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white p-24">
      {wallet ? (
        <>
          <WalletIcon wallet={wallet} className="mb-1" />
          <p className="mt-1 text-balance break-all text-center">
            {internalAddress}
          </p>
          <p className="mt-1 text-balance break-all text-center">{address}</p>
          <p className="mt-1">{ccc.fixedPointToString(balance)} CKB</p>
          <Button className="mt-2" onClick={open}>
            {internalAddress.slice(0, 7)}...{internalAddress.slice(-5)}
          </Button>
          <div className="mb-2 mt-2 flex">
            {tabs.map(([name]) => (
              <button
                key={name}
                className={`flex items-center border-b border-black px-5 py-2 text-lg ${tab === name ? "border-b-4" : ""}`}
                onClick={() => setTab(name)}
              >
                {name}
              </button>
            ))}
          </div>
          {tabs.find(([name]) => name === tab)?.[1]}
        </>
      ) : (
        <>
          <img
            src="https://raw.githubusercontent.com/ckb-ecofund/ccc/master/assets/logo.svg"
            alt="CCC Logo"
            className="mb-8 h-32 w-32"
          />
          <Button onClick={open}>Connect Wallet</Button>
        </>
      )}
      {error !== undefined ? (
        <p className="mt-4 text-balance break-all text-center font-bold text-red-400">
          {error}
        </p>
      ) : null}
      <Link
        className="mt-10 h-6 w-6"
        href="https://github.com/ckb-ecofund/ccc"
        target="_blank"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" id="github">
          <path d="M7.999 0C3.582 0 0 3.596 0 8.032a8.031 8.031 0 0 0 5.472 7.621c.4.074.546-.174.546-.387 0-.191-.007-.696-.011-1.366-2.225.485-2.695-1.077-2.695-1.077-.363-.928-.888-1.175-.888-1.175-.727-.498.054-.488.054-.488.803.057 1.225.828 1.225.828.714 1.227 1.873.873 2.329.667.072-.519.279-.873.508-1.074-1.776-.203-3.644-.892-3.644-3.969 0-.877.312-1.594.824-2.156-.083-.203-.357-1.02.078-2.125 0 0 .672-.216 2.2.823a7.633 7.633 0 0 1 2.003-.27 7.65 7.65 0 0 1 2.003.271c1.527-1.039 2.198-.823 2.198-.823.436 1.106.162 1.922.08 2.125.513.562.822 1.279.822 2.156 0 3.085-1.87 3.764-3.652 3.963.287.248.543.738.543 1.487 0 1.074-.01 1.94-.01 2.203 0 .215.144.465.55.386A8.032 8.032 0 0 0 16 8.032C16 3.596 12.418 0 7.999 0z"></path>
        </svg>
      </Link>
    </main>
  );
}
