import fetch from "cross-fetch";
import { TransactionLike } from "../../ckb";
import { Hex, HexLike, hexFrom } from "../../hex";
import { Num, NumLike, numFrom, numToHex } from "../../num";
import { Client } from "../client";
import {
  ClientFindCellsResponse,
  ClientIndexerSearchKeyLike,
  ClientTransactionResponse,
  OutputsValidator,
} from "../clientTypes";
import { JsonRpcPayload, JsonRpcTransformers } from "./advanced";

/**
 * Applies a transformation function to a value if the transformer is provided.
 *
 * @param value - The value to be transformed.
 * @param transformer - An optional transformation function.
 * @returns The transformed value if a transformer is provided, otherwise the original value.
 *
 * @example
 * ```typescript
 * const result = await transform(5, (x) => x * 2); // Outputs 10
 * const resultWithoutTransformer = await transform(5); // Outputs 5
 * ```
 */

async function transform(
  value: unknown,
  transformer?: (i: unknown) => unknown,
) {
  if (transformer) {
    return transformer(value);
  }
  return value;
}

/**
 * An abstract class implementing JSON-RPC client functionality for a specific URL and timeout.
 * Provides methods for sending transactions and building JSON-RPC payloads.
 */

export abstract class ClientJsonRpc extends Client {
  /**
   * Creates an instance of ClientJsonRpc.
   *
   * @param url - The URL of the JSON-RPC server.
   * @param timeout - The timeout for requests in milliseconds, default is 30000.
   */

  constructor(
    private readonly url_: string,
    private readonly timeout = 30000,
  ) {
    super();
  }

  /**
   * Returns the URL of the JSON-RPC server.
   *
   * @returns The URL of the JSON-RPC server.
   */

  get url() {
    return this.url_;
  }

  /**
   * Send a transaction to node.
   *
   * @param transaction - The transaction to send.
   * @param validator - "passthrough": Disable validation. "well_known_scripts_only": Only accept well known scripts in the transaction.
   * @returns Transaction hash.
   */

  sendTransactionNoCache = this.buildSender(
    "send_transaction",
    [JsonRpcTransformers.transactionFrom],
    hexFrom,
  ) as (
    transaction: TransactionLike,
    validator?: OutputsValidator | undefined,
  ) => Promise<Hex>;

  /**
   * Get a transaction from node.
   *
   * @param txHash - The hash of the transaction.
   * @returns The transaction with status.
   */

  getTransactionNoCache = this.buildSender(
    "get_transaction",
    [hexFrom],
    JsonRpcTransformers.transactionResponseTo,
  ) as (txHash: HexLike) => Promise<ClientTransactionResponse | null>;

  /**
   * find cells from node.
   *
   * @param key - The search key of cells.
   * @param order - The order of cells.
   * @param limit - The max return size of cells.
   * @param after - Pagination parameter.
   * @returns The found cells.
   */

  findCellsPagedNoCache = this.buildSender(
    "get_cells",
    [
      JsonRpcTransformers.indexerSearchKeyFrom,
      (order) => order ?? "asc",
      (limit) => numToHex(limit ?? 10),
    ],
    JsonRpcTransformers.findCellsResponseTo,
  ) as (
    key: ClientIndexerSearchKeyLike,
    order?: "asc" | "desc",
    limit?: NumLike,
    after?: string,
  ) => Promise<ClientFindCellsResponse>;

  /**
   * get cells capacity from node.
   *
   * @param key - The search key of cells.
   * @returns The sum of cells capacity.
   */

  getCellsCapacity = this.buildSender(
    "get_cells_capacity",
    [JsonRpcTransformers.indexerSearchKeyFrom],
    ({ capacity }) => numFrom(capacity),
  ) as (key: ClientIndexerSearchKeyLike) => Promise<Num>;

  /**
   * Builds a sender function for a JSON-RPC method.
   *
   * @param rpcMethod - The JSON-RPC method.
   * @param inTransformers - An array of input transformers.
   * @param outTransformer - An output transformer function.
   * @returns A function that sends a JSON-RPC request with the given method and transformed parameters.
   */

  buildSender(
    rpcMethod: string,
    inTransformers: (((_: any) => unknown) | undefined)[],
    outTransformer?: (_: any) => unknown,
  ) {
    return async (...req: unknown[]) => {
      const payload = ClientJsonRpc.buildPayload(
        rpcMethod,
        await Promise.all(
          req
            .concat(
              Array.from(
                new Array(Math.max(inTransformers.length - req.length, 0)),
              ),
            )
            .map((v, i) => transform(v, inTransformers[i])),
        ),
      );

      return transform(await this.send(payload), outTransformer);
    };
  }

  /**
   * Sends a JSON-RPC request to the server.
   *
   * @param payload - The JSON-RPC payload to send.
   * @returns The result of the JSON-RPC request.
   *
   * @throws Will throw an error if the response ID does not match the request ID, or if the response contains an error.
   */

  async send(payload: JsonRpcPayload) {
    const aborter = new AbortController();
    const abortTimer = setTimeout(() => aborter.abort(), this.timeout);

    const raw = await fetch(this.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: aborter.signal,
    });
    clearTimeout(abortTimer);

    const res = (await raw.json()) as {
      id: number;
      error: unknown;
      result: unknown;
    };
    if (res.id !== payload.id) {
      throw new Error(`Id mismatched, got ${res.id}, expected ${payload.id}`);
    }
    if (res.error) {
      throw res.error;
    }
    return res.result;
  }

  /**
   * Builds a JSON-RPC payload for the given method and parameters.
   *
   * @param method - The JSON-RPC method name.
   * @param req - The parameters for the JSON-RPC method.
   * @returns The JSON-RPC payload.
   */

  static buildPayload(method: string, req: unknown[]): JsonRpcPayload {
    return {
      id: Math.round(Math.random() * 10000),
      method,
      params: req,
      jsonrpc: "2.0",
    };
  }
}
