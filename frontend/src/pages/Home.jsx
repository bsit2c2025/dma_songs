import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentAnnouncement } from "../api/announcements";
import { useVoice } from "../context/VoiceContext";
import VoicePartSelector from "../components/music/VoicePartSelector";
import Spinner from "../components/common/Spinner";
import Button from "../components/common/Button";

export default function Home() {
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const { voicePart, setVoicePart } = useVoice();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    getCurrentAnnouncement()
      .then((data) => mounted && setAnnouncement(data))
      .catch(() => mounted && setAnnouncement(null))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelect = async (part) => {
    await setVoicePart(part);
    navigate("/music");
  };

  return (
    <div className="flex flex-col gap-12">
      <section className="rounded-xl border border-primary/10 bg-white px-6 py-12 text-center sm:px-12">
        {loading ? (
          <Spinner label="Loading announcement..." />
        ) : announcement ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              {formatDate(announcement.event_date)} • {formatTime(announcement.event_time)}
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold text-primary sm:text-4xl">
              {announcement.title}
            </h1>
            {announcement.subtitle && (
              <p className="mt-2 text-base text-muted">{announcement.subtitle}</p>
            )}
            <p className="mt-1 text-sm text-muted">{announcement.venue}</p>
            {announcement.description && (
              <p className="mx-auto mt-4 max-w-xl text-sm text-primary/80">{announcement.description}</p>
            )}
            <div className="mt-6">
              <Button variant="accent" onClick={() => navigate("/music")}>
                {announcement.cta_text || "Prepare your music"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="font-serif text-3xl font-bold text-primary">Welcome</h1>
            <p className="mt-2 text-sm text-muted">
              There's no published event announcement right now — check back soon.
            </p>
          </>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-primary">Select your voice part</h2>
          <p className="text-sm text-muted">
            {voicePart ? `Currently viewing as ${voicePart.name}.` : "Pick your part to see your music."}
          </p>
        </div>
        <VoicePartSelector selectedId={voicePart?.id} onSelect={handleSelect} />
      </section>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const date = new Date();
  date.setHours(Number(h), Number(m));
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
