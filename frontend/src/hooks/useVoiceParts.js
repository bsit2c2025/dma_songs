import { useEffect, useState } from "react";
import { listVoiceParts } from "../api/voiceParts";

export function useVoiceParts() {
  const [voiceParts, setVoiceParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    listVoiceParts()
      .then((data) => mounted && setVoiceParts(data))
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return { voiceParts, loading, error };
}
