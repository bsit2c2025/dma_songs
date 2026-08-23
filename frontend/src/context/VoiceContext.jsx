// Tracks which choir voice part the current visitor is viewing the site as.
// - Anonymous visitors: stored in localStorage only.
// - Logged-in users: initialized from their profile.voice_part, and changes
//   are also saved back to the profile via PATCH /api/users/me/.
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { updateMyProfile } from "../api/users";

const VoiceContext = createContext(null);
const STORAGE_KEY = "dma_selected_voice_part";

export function VoiceProvider({ children }) {
  const { isAuthenticated, profile, refreshProfile } = useAuth();
  const [voicePart, setVoicePartState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // When a logged-in user's profile loads/changes, prefer their saved voice part.
  useEffect(() => {
    if (isAuthenticated && profile?.voice_part) {
      setVoicePartState(profile.voice_part);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile.voice_part));
    }
  }, [isAuthenticated, profile]);

  const setVoicePart = useCallback(
    async (part) => {
      setVoicePartState(part);
      if (part) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(part));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      if (isAuthenticated) {
        try {
          await updateMyProfile({ voice_part: part?.id ?? null });
          await refreshProfile();
        } catch {
          // Non-fatal — the local selection still works for browsing.
        }
      }
    },
    [isAuthenticated, refreshProfile]
  );

  const clearVoicePart = useCallback(() => setVoicePart(null), [setVoicePart]);

  return (
    <VoiceContext.Provider value={{ voicePart, setVoicePart, clearVoicePart }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used within a VoiceProvider");
  return ctx;
}
