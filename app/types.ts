export type ViewMode = "summary" | "json";

export enum Protocol {
    SOLANA = "SOLANA",
    CARDANO = "CARDANO",
    SUI = "SUI",
  }
  
export const protocolDisplayName: Record<Protocol, string> = {
  [Protocol.SOLANA]: "Solana",
  [Protocol.CARDANO]: "Cardano",
  [Protocol.SUI]: "Sui",
};
