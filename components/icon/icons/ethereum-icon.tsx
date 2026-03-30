import * as React from "react";

const EthereumIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="16" cy="16" r="16" fill="white" />
      <path d="M16 5L8.5 16.5L16 20.5L23.5 16.5L16 5Z" fill="#627EEA" fillOpacity="0.6" />
      <path d="M16 5L8.5 16.5L16 20.5V5Z" fill="#627EEA" />
      <path d="M16 22L8.5 18L16 27L23.5 18L16 22Z" fill="#627EEA" fillOpacity="0.6" />
      <path d="M16 22L8.5 18L16 27V22Z" fill="#627EEA" />
    </svg>
  );
};

export default EthereumIcon;
