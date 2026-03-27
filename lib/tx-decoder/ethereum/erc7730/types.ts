export interface Erc7730Field {
  path?: string;
  label: string;
  format: string;
  params?: Record<string, unknown>;
  visible?: unknown;
}

export interface Erc7730FunctionFormat {
  intent: string | Record<string, string>;
  interpolatedIntent?: string;
  fields: Erc7730Field[];
}

export interface Erc7730Descriptor {
  metadata: {
    owner: string;
    contractName: string;
    decimals?: number;
    token?: { name: string; ticker: string; decimals: number };
    enums?: Record<string, Record<string, string>>;
    constants?: Record<string, unknown>;
  };
  display: {
    formats: Record<string, Erc7730FunctionFormat>;
    definitions?: Record<string, Erc7730Field>;
  };
}

export type DecodedFieldValue =
  | { kind: "address"; value: string }
  | { kind: "uint256"; value: string }
  | { kind: "raw"; value: string };

export interface DecodedField {
  path?: string;
  label: string;
  format: string;
  params?: Record<string, unknown>;
  decoded: DecodedFieldValue;
  visible?: unknown;
}

export interface Erc7730MatchResult {
  kind: "matched";
  intent: string;
  interpolatedIntent?: string;
  contractName: string;
  functionSignature: string;
  selector: string;
  fields: DecodedField[];
  decimals?: number;
  token?: { name: string; ticker: string; decimals: number };
  enums?: Record<string, Record<string, string>>;
}

export interface Erc7730FallbackResult {
  kind: "unknown";
  selector: string;
  rawCalldata: string;
}

export type Erc7730DecodeResult = Erc7730MatchResult | Erc7730FallbackResult;
