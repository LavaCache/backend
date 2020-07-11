/**
 * Redis' Key-length Reduction
 * note: length of redis key might affect connection latency to redis,
 *       using hex as key might save 33% of data size
 */
export function iptoHex(IP: string): string {
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
export function micro_to_mili(microNumber: number): number {
  return Math.floor(microNumber / 1000000);
}

export function isExist(data: any): boolean {
  return typeof data !== 'undefined' && data !== null;
}