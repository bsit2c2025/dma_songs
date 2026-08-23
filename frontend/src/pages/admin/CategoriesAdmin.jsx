import { useEffect, useState } from "react";
import { createCategory, deleteCategory, listCategories, updateCategory } from "../../api/categories";
import PageHeader from "../../components/layout/PageHeader";
import DataTable from "../../components/admin/DataTable";
import ConfirmDeleteButton from "../../components/admin/ConfirmDeleteButton";
import TextField from "../../components/common/TextField";
import Button from "../../components/common/Button";
import ErrorMessage from "../../components/common/ErrorMessage";
import Spinner from "../../components/common/Spinner";

const emptyForm = { name: "", slug: "", display_order: 0 };

export default function CategoriesAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () =>
    listCategories()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: field === "display_order" ? Number(e.target.value) : e.target.value }));

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({ name: item.name, slug: item.slug, display_order: item.display_order });
  };

  const handleNew = () => {
    setEditingId("new");
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId === "new") {
        await createCategory(form);
      } else {
        await updateCategory(editingId, form);
      }
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.message || "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner label="Loading categories..." />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Song Categories"
        description="Manage the liturgical categories songs are grouped under."
        actions={<Button variant="accent" onClick={handleNew}>+ New category</Button>}
      />

      <ErrorMessage message={error} />

      {editingId && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-primary/10 bg-white p-5 sm:flex-row sm:items-end">
          <TextField label="Name" value={form.name} onChange={handleChange("name")} required />
          <TextField label="Slug" value={form.slug} onChange={handleChange("slug")} required />
          <TextField label="Display order" type="number" value={form.display_order} onChange={handleChange("display_order")} />
          <div className="flex gap-2">
            <Button type="submit" variant="accent" loading={saving}>Save</Button>
            <Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
          </div>
        </form>
      )}

      <DataTable
        rowKey="id"
        rows={items}
        emptyMessage="No categories yet."
        columns={[
          { key: "name", header: "Name" },
          { key: "slug", header: "Slug" },
          { key: "display_order", header: "Order" },
          {
            key: "actions",
            header: "",
            render: (row) => (
              <div className="flex justify-end gap-3">
                <button onClick={() => handleEdit(row)} className="text-xs font-medium text-accent hover:underline">
                  Edit
                </button>
                <ConfirmDeleteButton
                  itemName={row.name}
                  onConfirm={async () => {
                    await deleteCategory(row.id);
                    await load();
                  }}
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
