export default function SearchBar({ value, onChange, placeholder = "Search songs or composers..." }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-primary/15 bg-white px-3 py-2 text-sm text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:w-72"
    />
  );
}
