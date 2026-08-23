import { useEffect, useState } from "react";
import {
  createSong,
  deleteSong,
  duplicateSong,
  listSongs,
  reorderSongs,
  toggleSongPublish,
  updateSong,
} from "../../api/songs";
import PageHeader from "../../components/layout/PageHeader";
import DataTable from "../../components/admin/DataTable";
import ConfirmDeleteButton from "../../components/admin/ConfirmDeleteButton";
import SongForm from "../../components/admin/SongForm";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import ErrorMessage from "../../components/common/ErrorMessage";
import Spinner from "../../components/common/Spinner";

export default function SongsAdmin() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | song object
  const [saving, setSaving] = useState(false);

  const load = () =>
    listSongs({ published: undefined })
      .then((data) => setSongs(data.results ?? data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (formValues) => {
    setSaving(true);
    setError(null);
    try {
      if (editing === "new") {
        await createSong(formValues);
      } else {
        await updateSong(editing.id, formValues);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message || "Failed to save song.");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (id) => {
    setError(null);
    try {
      await toggleSongPublish(id);
      await load();
    } catch (err) {
      setError(err.message || "Failed to update publish status.");
    }
  };

  const handleDuplicate = async (id) => {
    setError(null);
    try {
      await duplicateSong(id);
      await load();
    } catch (err) {
      setError(err.message || "Failed to duplicate song.");
    }
  };

  const move = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= songs.length) return;
    const reordered = [...songs];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setSongs(reordered);
    try {
      await reorderSongs(reordered.map((s) => s.id));
    } catch (err) {
      setError(err.message || "Failed to reorder songs.");
      await load();
    }
  };

  if (loading) return <Spinner label="Loading songs..." />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Songs"
        description="Add songs, assign voice parts and categories, attach media, and control what's published."
        actions={
          <Button variant="accent" onClick={() => setEditing("new")}>
            + New song
          </Button>
        }
      />

      <ErrorMessage message={error} />

      {editing && (
        <SongForm
          song={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSubmit={handleSubmit}
          saving={saving}
        />
      )}

      <DataTable
        rowKey="id"
        rows={songs}
        emptyMessage="No songs yet."
        columns={[
          {
            key: "order",
            header: "Order",
            render: (row) => {
              const index = songs.findIndex((s) => s.id === row.id);
              return (
                <div className="flex gap-1">
                  <button onClick={() => move(index, -1)} className="text-muted hover:text-primary" aria-label="Move up">
                    ↑
                  </button>
                  <button onClick={() => move(index, 1)} className="text-muted hover:text-primary" aria-label="Move down">
                    ↓
                  </button>
                </div>
              );
            },
          },
          { key: "title", header: "Title" },
          { key: "composer", header: "Composer" },
          { key: "category", header: "Category", render: (row) => row.category?.name },
          {
            key: "voice_parts",
            header: "Voice parts",
            render: (row) => row.voice_parts?.map((v) => v.name).join(", ") || "—",
          },
          {
            key: "published",
            header: "Status",
            render: (row) => (
              <button onClick={() => handleTogglePublish(row.id)}>
                <Badge tone={row.published ? "success" : "warning"}>
                  {row.published ? "Published" : "Draft"}
                </Badge>
              </button>
            ),
          },
          {
            key: "actions",
            header: "",
            render: (row) => (
              <div className="flex justify-end gap-3">
                <button onClick={() => setEditing(row)} className="text-xs font-medium text-accent hover:underline">
                  Edit
                </button>
                <button onClick={() => handleDuplicate(row.id)} className="text-xs font-medium text-muted hover:underline">
                  Duplicate
                </button>
                <ConfirmDeleteButton
                  itemName={row.title}
                  onConfirm={async () => {
                    await deleteSong(row.id);
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
