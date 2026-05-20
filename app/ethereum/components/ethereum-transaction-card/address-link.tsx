const EXPLORER_BASES: Record<string, string> = {
  "1": "https://etherscan.io/address",
  "560048": "https://hoodi.etherscan.io/address",
};

const DEFAULT_EXPLORER_BASE = "https://etherscan.io/address";

export const formatAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

const AddressLink = ({
  address,
  chainId,
}: {
  address: string;
  chainId?: string;
}) => {
  const base = (chainId && EXPLORER_BASES[chainId]) ?? DEFAULT_EXPLORER_BASE;
  return (
    <a
      href={`${base}/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
    >
      {formatAddress(address)}
    </a>
  );
};

export default AddressLink;
