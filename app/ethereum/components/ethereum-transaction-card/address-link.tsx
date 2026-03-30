const ETHERSCAN_BASE = "https://etherscan.io/address";

export const formatAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

const AddressLink = ({ address }: { address: string }) => (
  <a
    href={`${ETHERSCAN_BASE}/${address}`}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
  >
    {formatAddress(address)}
  </a>
);

export default AddressLink;
