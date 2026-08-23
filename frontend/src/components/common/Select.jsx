export default function Select({ label, error, className = "", children, ...props }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="font-medium text-primary">{label}</span>}
      <select
        className={`rounded-md border border-primary/15 bg-white px-3 py-2 text-sm text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
