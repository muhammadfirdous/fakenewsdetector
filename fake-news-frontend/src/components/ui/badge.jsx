export function Badge({ children, className }) {
  return <span className={`px-3 py-1 rounded-full ${className}`}>{children}</span>;
}