export function Tabs({ children }) {
  return <div>{children}</div>;
}

export function TabsList({ children }) {
  return <div className="flex gap-2">{children}</div>;
}

export function TabsTrigger({ children, onClick }) {
  return (
    <button onClick={onClick} className="px-4 py-2 bg-gray-200 rounded-xl">
      {children}
    </button>
  );
}

export function TabsContent({ children }) {
  return <div className="mt-4">{children}</div>;
}