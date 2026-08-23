import { useEffect, useState } from "react";
import { useCategories } from "../../hooks/useCategories";
import { useVoiceParts } from "../../hooks/useVoiceParts";
import { getSignedUploadUrl, uploadToSignedUrl } from "../../api/storage";
import TextField from "../common/TextField";
import TextArea from "../common/TextArea";
import Select from "../common/Select";
import Button from "../common/Button";
import ErrorMessage from "../common/ErrorMessage";

const NOTE_TYPES = ["", "recited", "instrumental", "descant", "other"];

const toFormState = (song) => ({
  title: song?.title || "",
  composer: song?.composer || "",
  category_id: song?.category?.id || "",
  description: song?.description || "",
  notes: song?.notes || "",
  note_type: song?.note_type || "",
  youtube_url: song?.youtube_url || "",
  music_sheet_url: song?.music_sheet_url || "",
  music_sheet_file_url: song?.music_sheet_file_url || "",
  published: song?.published || false,
  display_order: song?.display_order ?? 0,
  voice_part_ids: song?.voice_parts?.map((v) => v.id) || [],
});

export default function SongForm({ song, onCancel, onSubmit, saving }) {
  const { categories } = useCategories();
  const { voiceParts } = useVoiceParts();
  const [form, setForm] = useState(toFormState(song));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => setForm(toFormState(song)), [song]);

  const handleChange = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const toggleVoicePart = (id) => {
    setForm((f) => ({
      ...f,
      voice_part_ids: f.voice_part_ids.includes(id)
        ? f.voice_part_ids.filter((v) => v !== id)
        : [...f.voice_part_ids, id],
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { signed_url, public_url } = await getSignedUploadUrl({
        purpose: "music-sheet",
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });
      await uploadToSignedUrl(signed_url, file);
      setForm((f) => ({ ...f, music_sheet_file_url: public_url }));
    } catch (err) {
      setUploadError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, display_order: Number(form.display_order) });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-primary/10 bg-white p-5">
      <h2 className="text-sm font-semibold text-primary">{song ? "Edit song" : "New song"}</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Title" value={form.title} onChange={handleChange("title")} required />
        <TextField label="Composer" value={form.composer} onChange={handleChange("composer")} />

        <Select label="Category" value={form.category_id} onChange={handleChange("category_id")} required>
          <option value="" disabled>
            Select a category
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Select label="Note type" value={form.note_type} onChange={handleChange("note_type")}>
          {NOTE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t || "None"}
            </option>
          ))}
        </Select>

        <TextField label="YouTube URL" value={form.youtube_url} onChange={handleChange("youtube_url")} />
        <TextField label="Sheet music link (external)" value={form.music_sheet_url} onChange={handleChange("music_sheet_url")} />
        <TextField label="Display order" type="number" value={form.display_order} onChange={handleChange("display_order")} />

        <label className="flex items-center gap-2 self-end text-sm font-medium text-primary">
          <input type="checkbox" checked={form.published} onChange={handleChange("published")} />
          Published
        </label>
      </div>

      <TextArea label="Description" value={form.description} onChange={handleChange("description")} />
      <TextArea label="Notes" value={form.notes} onChange={handleChange("notes")} />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-primary">Assigned voice parts</span>
        <div className="flex flex-wrap gap-2">
          {voiceParts.map((vp) => (
            <button
              type="button"
              key={vp.id}
              onClick={() => toggleVoicePart(vp.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                form.voice_part_ids.includes(vp.id)
                  ? "bg-accent text-white"
                  : "bg-primary/5 text-primary hover:bg-primary/10"
              }`}
            >
              {vp.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-primary">Sheet music file (PDF/JPG/PNG, up to 15MB)</span>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} disabled={uploading} />
        {uploading && <p className="text-xs text-muted">Uploading...</p>}
        {form.music_sheet_file_url && (
          <a href={form.music_sheet_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
            Current file — view
          </a>
        )}
        <ErrorMessage message={uploadError} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" variant="accent" loading={saving}>
          Save
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
