import { useEffect, useState } from "react";
import {
  createAnnouncement,
  listAnnouncements,
  publishAnnouncement,
  updateAnnouncement,
} from "../../api/announcements";
import PageHeader from "../../components/layout/PageHeader";
import TextField from "../../components/common/TextField";
import TextArea from "../../components/common/TextArea";
import Button from "../../components/common/Button";
import ErrorMessage from "../../components/common/ErrorMessage";
import Spinner from "../../components/common/Spinner";
import Badge from "../../components/common/Badge";

const emptyForm = {
  title: "",
  subtitle: "",
  event_date: "",
  event_time: "",
  venue: "",
  description: "",
  hero_image_url: "",
  cta_text: "",
};

export default function AnnouncementAdmin() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = () =>
    listAnnouncements()
      .then((data) => setAnnouncements(data.results ?? data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleEdit = (announcement) => {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title || "",
      subtitle: announcement.subtitle || "",
      event_date: announcement.event_date || "",
      event_time: announcement.event_time || "",
      venue: announcement.venue || "",
      description: announcement.description || "",
      hero_image_url: announcement.hero_image_url || "",
      cta_text: announcement.cta_text || "",
    });
  };

  const handleNew = () => {
    setEditingId("new");
    setForm(emptyForm);
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId === "new") {
        await createAnnouncement(form);
      } else {
        await updateAnnouncement(editingId, form);
      }
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.message || "Failed to save announcement.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id) => {
    setError(null);
    try {
      await publishAnnouncement(id);
      await load();
    } catch (err) {
      setError(err.message || "Failed to publish.");
    }
  };

  if (loading) return <Spinner label="Loading announcements..." />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Announcement"
        description="Only one announcement can be published at a time — the public hero shows it."
        actions={
          <Button variant="accent" onClick={handleNew}>
            + New announcement
          </Button>
        }
      />

      <ErrorMessage message={error} />

      {editingId && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-primary/10 bg-white p-5">
          <h2 className="text-sm font-semibold text-primary">
            {editingId === "new" ? "New announcement" : "Edit announcement"}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Title" value={form.title} onChange={handleChange("title")} required />
            <TextField label="Subtitle" value={form.subtitle} onChange={handleChange("subtitle")} />
            <TextField label="Event date" type="date" value={form.event_date} onChange={handleChange("event_date")} required />
            <TextField label="Event time" type="time" value={form.event_time} onChange={handleChange("event_time")} required />
            <TextField label="Venue" value={form.venue} onChange={handleChange("venue")} required />
            <TextField label="CTA text" value={form.cta_text} onChange={handleChange("cta_text")} />
            <TextField
              label="Hero image URL"
              value={form.hero_image_url}
              onChange={handleChange("hero_image_url")}
              className="sm:col-span-2"
            />
          </div>
          <TextArea label="Description" value={form.description} onChange={handleChange("description")} />
          <div className="flex gap-2">
            <Button type="submit" variant="accent" loading={saving}>
              Save
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {announcements.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg border border-primary/10 bg-white p-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-primary">{a.title}</p>
                {a.published && <Badge tone="success">Published</Badge>}
              </div>
              <p className="text-xs text-muted">
                {a.event_date} at {a.event_time} — {a.venue}
              </p>
            </div>
            <div className="flex gap-2">
              {!a.published && (
                <Button variant="outline" onClick={() => handlePublish(a.id)}>
                  Publish
                </Button>
              )}
              <Button variant="ghost" onClick={() => handleEdit(a)}>
                Edit
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
