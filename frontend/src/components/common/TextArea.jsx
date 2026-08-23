export default function TextArea({ label, error, className = "", ...props }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="font-medium text-primary">{label}</span>}
      <textarea
        className={`rounded-md border border-primary/15 px-3 py-2 text-sm text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent ${className}`}
        rows={4}
        {...props}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
