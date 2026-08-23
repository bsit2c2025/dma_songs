const VARIANTS = {
  primary: "bg-primary text-white hover:bg-primary/90",
  accent: "bg-accent text-white hover:bg-accent/90",
  outline: "border border-primary/20 text-primary hover:bg-primary/5",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-primary hover:bg-primary/5",
};

export default function Button({
  variant = "primary",
  className = "",
  disabled = false,
  loading = false,
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}
