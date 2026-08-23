import { useVoiceParts } from "../../hooks/useVoiceParts";
import Spinner from "../common/Spinner";
import ErrorMessage from "../common/ErrorMessage";

export default function VoicePartSelector({ selectedId, onSelect }) {
  const { voiceParts, loading, error } = useVoiceParts();

  if (loading) return <Spinner label="Loading voice parts..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {voiceParts.map((part) => (
        <button
          key={part.id}
          onClick={() => onSelect(part)}
          className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
            selectedId === part.id
              ? "border-accent bg-accent text-white"
              : "border-primary/15 bg-white text-primary hover:border-accent hover:text-accent"
          }`}
        >
          {part.name}
        </button>
      ))}
    </div>
  );
}
