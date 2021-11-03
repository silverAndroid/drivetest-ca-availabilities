export async function promisesConcat<T = unknown>(
  promises: (<R>(result?: R) => Promise<any>)[],
): Promise<T> {
  let result;
  for (const promiseFn of promises) {
    result = await promiseFn(result);
  }
  return result as T;
}
