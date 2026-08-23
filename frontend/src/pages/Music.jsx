import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listSongs } from "../api/songs";
import { useVoice } from "../context/VoiceContext";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import PageHeader from "../components/layout/PageHeader";
import SearchBar from "../components/music/SearchBar";
import CategoryFilter from "../components/music/CategoryFilter";
import SongList from "../components/music/SongList";
import Spinner from "../components/common/Spinner";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";

export default function Music() {
  const { voicePart } = useVoice();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!voicePart) return;
    let mounted = true;
    setLoading(true);
    listSongs({ voice: voicePart.slug, category: category || undefined, search: debouncedSearch || undefined })
      .then((data) => mounted && setSongs(data.results ?? data))
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [voicePart, category, debouncedSearch]);

  if (!voicePart) {
    return (
      <EmptyState
        title="Choose a voice part first"
        description="Head back home and select which choir voice part you sing to see your music."
        action={
          <Link to="/" className="mt-2 text-sm font-medium text-accent hover:underline">
            Go to voice part selection
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Your music"
        title={`Songs for ${voicePart.name}`}
        description="Everything published for your voice part — sheet music and YouTube references included."
        actions={
          <Link to="/" className="text-sm font-medium text-accent hover:underline">
            Change voice part
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar value={search} onChange={setSearch} />
        <CategoryFilter value={category} onChange={setCategory} />
      </div>

      {loading && <Spinner label="Loading songs..." />}
      {error && <ErrorMessage message={error} />}
      {!loading && !error && <SongList songs={songs} />}
    </div>
  );
}
