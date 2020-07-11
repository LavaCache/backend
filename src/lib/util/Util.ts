/**
 * Redis' Key-length Reduction
 * note: length of redis key might affect connection latency to redis,
 *       using hex as key might save 33% of data size
 */
export function ipToHex(IP: string): string {
  const ipHex: string = IP.split('.')
    .reduce((accumulator: number, current: string) => {
      const currentVal: number = parseInt(current, 10);
      if (currentVal > 255) {
        throw new Error('Given address contains invalid number');
      }
      return accumulator * 256 + currentVal;
    }, 0)
    .toString(16);
  return `0x${ipHex === '0' ? '00000000' : ipHex}`;
}

/***
 * Transform datatype
 */
export function micro_to_milli(microNumber: number): number {
  return Math.floor(microNumber / 1000000);
}

/**
 * Whether a value exists or not.
 * @param data The value to check.
 * @since 1.0.0
 */
export function exists(data: any): boolean {
  return typeof data !== 'undefined' && data !== null;
}

/**
 * Pluck specific values from an object.
 * @param obj The object to pluck values from.
 * @param keys The value keys to pluck.
 * @param newObj Whether to create a new object.
 * @since 1.0.0
 */
export function pluck<T extends Object, K extends keyof T>(obj: T, keys: K[], newObj: boolean = true): Omit<T, K> {
  let o = newObj ? { ...obj } : obj;
  for (const key of keys) delete o[key];
  return o;
}
