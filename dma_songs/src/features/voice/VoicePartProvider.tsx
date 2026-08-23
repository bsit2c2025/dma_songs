import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { STORAGE_KEYS } from "@/lib/constants";
import { useAuth } from "@/features/auth/AuthProvider";
import { useVoiceClassifications } from "@/hooks/useVoiceClassifications";
import { updateOwnProfile } from "@/services/members";
import { queryKeys } from "@/lib/queryKeys";
import type { VoiceClassification } from "@/types/models";

interface VoicePartState {
  parts: VoiceClassification[];
  selected: VoiceClassification | null;
  selectedId: string | null;
  isLoading: boolean;
  select: (id: string | null) => void;
  clear: () => void;
}

const VoicePartContext = React.createContext<VoicePartState | null>(null);

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.voicePart);
  } catch {
    return null;
  }
}

function writeStored(id: string | null) {
  try {
    if (id) window.localStorage.setItem(STORAGE_KEYS.voicePart, id);
    else window.localStorage.removeItem(STORAGE_KEYS.voicePart);
  } catch {
    /* private browsing — the selection just won't persist */
  }
}

/**
 * The selected voice part is a content preference, not a permission. Guests
 * keep it in localStorage; signed-in members keep it on their profile row so
 * it follows them between devices. When a guest signs in and their profile has
 * no part yet, the local choice is adopted.
 */
export function VoicePartProvider({ children }: { children: React.ReactNode }) {
  const { data: parts = [], isLoading } = useVoiceClassifications();
  const { profile, status } = useAuth();
  const queryClient = useQueryClient();
  const [localId, setLocalId] = React.useState<string | null>(() => readStored());
  const syncedRef = React.useRef<string | null>(null);

  const profileVoiceId = profile?.voice_classification_id ?? null;

  React.useEffect(() => {
    if (status !== "authenticated" || !profile) return;

    if (profileVoiceId) {
      setLocalId(profileVoiceId);
      writeStored(profileVoiceId);
      return;
    }
    // Adopt the guest selection once, right after signing in.
    if (localId && syncedRef.current !== profile.id) {
      syncedRef.current = profile.id;
      updateOwnProfile(profile.id, { voice_classification_id: localId })
        .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.profile(profile.id) }))
        .catch(() => undefined);
    }
  }, [status, profile, profileVoiceId, localId, queryClient]);

  const select = React.useCallback(
    (id: string | null) => {
      setLocalId(id);
      writeStored(id);
      if (profile) {
        updateOwnProfile(profile.id, { voice_classification_id: id })
          .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.profile(profile.id) }))
          .catch(() => undefined);
      }
    },
    [profile, queryClient],
  );

  const selectedId = React.useMemo(() => {
    const candidate = profileVoiceId ?? localId;
    if (!candidate) return null;
    // A part can be removed or deactivated while a stale id sits in storage.
    return parts.some((p) => p.id === candidate) ? candidate : null;
  }, [profileVoiceId, localId, parts]);

  const value = React.useMemo<VoicePartState>(
    () => ({
      parts,
      selectedId,
      selected: parts.find((p) => p.id === selectedId) ?? null,
      isLoading,
      select,
      clear: () => select(null),
    }),
    [parts, selectedId, isLoading, select],
  );

  return <VoicePartContext.Provider value={value}>{children}</VoicePartContext.Provider>;
}

export function useVoicePart() {
  const context = React.useContext(VoicePartContext);
  if (!context) throw new Error("useVoicePart must be used inside <VoicePartProvider>.");
  return context;
}
