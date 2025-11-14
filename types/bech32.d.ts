declare module "bech32" {
  interface Bech32 {
    encode(hrp: string, data: number[], limit?: number): string;
    toWords(bytes: Uint8Array | number[]): number[];
  }

  export const bech32: Bech32;
}

