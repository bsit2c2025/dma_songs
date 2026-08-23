export default function Badge({ children, tone = "muted" }) {
  const tones = {
    muted: "bg-primary/5 text-muted",
    accent: "bg-accent/10 text-accent",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
