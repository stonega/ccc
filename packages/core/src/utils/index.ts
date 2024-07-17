/**
 * A type safe way to apply a transformer on a value if it's not empty.
 *
 * @param transformer - The transformer.
 * @param value - The value to be transformed.
 * @returns If the value is empty, it remains its type. Otherwise it will be transformed.
 */
export function apply<T, R>(
  transformer: (val: T) => R,
  value: undefined,
): undefined;
/**
 * A type safe way to apply a transformer on a value if it's not empty.
 *
 * @param transformer - The transformer.
 * @param value - The value to be transformed.
 * @returns If the value is empty, it remains its type. Otherwise it will be transformed.
 */
export function apply<T, R>(transformer: (val: T) => R, value: null): null;
/**
 * A type safe way to apply a transformer on a value if it's not empty.
 *
 * @param transformer - The transformer.
 * @param value - The value to be transformed.
 * @returns If the value is empty, it remains its type. Otherwise it will be transformed.
 */
export function apply<T, R>(transformer: (val: T) => R, value: T): R;
/**
 * A type safe way to apply a transformer on a value if it's not empty.
 *
 * @param transformer - The transformer.
 * @param value - The value to be transformed.
 * @returns If the value is empty, it remains its type. Otherwise it will be transformed.
 */
export function apply<T, R>(
  transformer: (val: T) => R,
  value: T | undefined,
): R | undefined;
/**
 * A type safe way to apply a transformer on a value if it's not empty.
 *
 * @param transformer - The transformer.
 * @param value - The value to be transformed.
 * @returns If the value is empty, it remains its type. Otherwise it will be transformed.
 */
export function apply<T, R>(
  transformer: (val: T) => R,
  value: T | null,
): R | null;
/**
 * A type safe way to apply a transformer on a value if it's not empty.
 *
 * @param transformer - The transformer.
 * @param value - The value to be transformed.
 * @returns If the value is empty, it remains its type. Otherwise it will be transformed.
 */
export function apply<T, R>(
  transformer: (val: T) => R,
  value: undefined | null,
): undefined | null;
/**
 * A type safe way to apply a transformer on a value if it's not empty.
 *
 * @param transformer - The transformer.
 * @param value - The value to be transformed.
 * @returns If the value is empty, it remains its type. Otherwise it will be transformed.
 */
export function apply<T, R>(
  transformer: (val: T) => R,
  value: T | undefined | null,
): R | undefined | null {
  if (value == null) {
    return value as undefined | null;
  }

  return transformer(value);
}

/**
 * Similar to Array.reduce, but the accumulator can returns Promise.
 *
 * @param values - The array to be reduced.
 * @param accumulator - A callback to be called for each value. If it returns null, the previous result will be kept.
 * @returns The accumulated result.
 */
export async function reduceAsync<T, V>(
  values: T[],
  accumulator: (
    a: T,
    b: T,
  ) => Promise<T | undefined | null | void> | T | undefined | null | void,
): Promise<T>;
/**
 * Similar to Array.reduce, but the accumulator can returns Promise.
 *
 * @param values - The array to be reduced.
 * @param accumulator - A callback to be called for each value. If it returns null, the previous result will be kept.
 * @param init - The initial value.
 * @returns The accumulated result.
 */
export async function reduceAsync<T, V>(
  values: V[],
  accumulator: (
    a: T,
    b: V,
    i: number,
    values: V[],
  ) => Promise<T | undefined | null | void> | T | undefined | null | void,
  init: T,
): Promise<T>;
export async function reduceAsync<T, V>(
  values: (V | T)[],
  accumulator: (
    a: T,
    b: T | V,
    i: number,
    values: (V | T)[],
  ) => Promise<T | undefined | null | void> | T | undefined | null | void,
  init?: T,
): Promise<T> {
  if (init === undefined) {
    if (values.length === 0) {
      throw new TypeError("Reduce of empty array with no initial value");
    }
    init = values[0] as T;
    values = values.slice(1);
  }

  return values.reduce(
    (current: Promise<T>, b: T | V, i, array) =>
      current.then((v) =>
        Promise.resolve(accumulator(v, b, i, array)).then((r) => r ?? v),
      ),
    Promise.resolve(init),
  );
}

export function isWebview(userAgent: string): boolean {
  return /webview|wv|ip((?!.*Safari)|(?=.*like Safari))/i.test(userAgent);
}
