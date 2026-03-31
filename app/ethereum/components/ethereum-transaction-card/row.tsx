const Row = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <>
    <span className="font-medium text-gray-600 whitespace-nowrap">{label}</span>
    <span className="text-gray-900 font-mono text-sm break-all">{children}</span>
  </>
);

export default Row;
