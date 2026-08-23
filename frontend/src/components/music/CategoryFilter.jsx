import { useCategories } from "../../hooks/useCategories";

export default function CategoryFilter({ value, onChange }) {
  const { categories } = useCategories();

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-primary/15 bg-white px-3 py-2 text-sm text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
    >
      <option value="">All categories</option>
      {categories.map((cat) => (
        <option key={cat.id} value={cat.slug}>
          {cat.name}
        </option>
      ))}
    </select>
  );
}
