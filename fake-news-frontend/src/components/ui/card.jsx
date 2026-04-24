export function Card({ children, className }) {
  return <div className={`bg-white ${className}`}>{children}</div>;
}

export function CardHeader({ children }) {
  return <div className="p-4">{children}</div>;
}

export function CardTitle({ children }) {
  return <h2 className="text-xl font-bold">{children}</h2>;
}

export function CardDescription({ children }) {
  return <p className="text-gray-500">{children}</p>;
}

export function CardContent({ children }) {
  return <div className="p-4">{children}</div>;
}