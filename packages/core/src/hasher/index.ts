import blake2b, { Blake2b } from "blake2b";
import { BytesLike, bytesFrom } from "../bytes";
import { Hex } from "../hex";
import { CKB_BLAKE2B_PERSONAL } from "./advanced";

export class Hasher {
  private readonly hasher: Blake2b;

  /**
   * Creates an instance of Hasher.
   *
   * @param outLength - The output length of the hash in bytes. Default is 32.
   * @param personal - The personal string for the Blake2b algorithm. Default is CKB_BLAKE2B_PERSONAL.
   */

  constructor(outLength = 32, personal = CKB_BLAKE2B_PERSONAL) {
    this.hasher = blake2b(
      outLength,
      undefined,
      undefined,
      bytesFrom(personal, "utf8"),
    );
  }

  /**
   * Updates the hash with the given data.
   *
   * @param data - The data to update the hash with.
   * @returns The current Hasher instance for chaining.
   *
   * @example
   * ```typescript
   * const hasher = new Hasher();
   * hasher.update("some data").update("more data");
   * const hash = hasher.digest();
   * ```
   */

  update(data: BytesLike): Hasher {
    this.hasher.update(bytesFrom(data));
    return this;
  }

  /**
   * Finalizes the hash and returns the digest as a hexadecimal string.
   *
   * @returns The hexadecimal string representation of the hash.
   *
   * @example
   * ```typescript
   * const hasher = new Hasher();
   * hasher.update("some data");
   * const hash = hasher.digest(); // Outputs something like "0x..."
   * ```
   */

  digest(): Hex {
    return `0x${this.hasher.digest("hex")}`;
  }
}

/**
 * Computes the CKB hash of the given data using the Blake2b algorithm.
 *
 * @param data - The data to hash.
 * @returns The hexadecimal string representation of the hash.
 *
 * @example
 * ```typescript
 * const hash = ckbHash("some data"); // Outputs something like "0x..."
 * ```
 */

export function ckbHash(...data: BytesLike[]): Hex {
  const hasher = new Hasher();
  data.forEach((d) => hasher.update(d));
  return hasher.digest();
}
