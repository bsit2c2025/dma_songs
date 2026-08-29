import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { STORAGE_KEYS } from "@/lib/constants";
import { useAuth } from "@/features/auth/AuthProvider";
import { useVoiceClassifications } from "@/hooks/useVoiceClassifications";
import { updateOwnProfile } from "@/services/members";
import {
  cancelVoiceChangeRequest,
  getMyPendingRequest,
  requestVoiceChange,
} from "@/services/voiceRequests";
import { queryKeys } from "@/lib/queryKeys";
import { errorMessage } from "@/lib/errors";
import type { VoiceChangeRequest, VoiceClassification } from "@/types/models";

interface VoicePartState {
  parts: VoiceClassification[];
  /** The part this person actually sings — their section, not a filter. */
  myPart: VoiceClassification | null;
  myPartId: string | null;
  /** True when the member has never chosen, so the next pick is free. */
  isFirstChoice: boolean;
  pendingRequest: VoiceChangeRequest | null;
  isLoading: boolean;
  isSubmitting: boolean;
  /**
   * Guests and first-time members are applied immediately; an established
   * member's change becomes a request for an administrator.
   */
  choosePart: (id: string, note?: string) => Promise<void>;
  cancelRequest: () => Promise<void>;
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
 * A member's voice part is their section, decided once and then changed only
 * with an administrator's approval. It is deliberately not the same thing as
 * the library filter: browsing another section's music is useful and harmless,
 * so the filter lives in the page's URL and this provider only tracks who you
 * actually are.
 *
 * Guests no longer have a voice part at all. They once did — the choice lived
 * in localStorage and filtered the library — but the library is members-only
 * now, so a guest picking a section chose nothing, while the header still
 * showed their chip next to the sign-in button as though they had an account.
 * A setting that does nothing is worse than no setting.
 */
export function VoicePartProvider({ children }: { children: React.ReactNode }) {
  const { data: parts = [], isLoading } = useVoiceClassifications();
  const { profile, status, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const adoptedRef = React.useRef<string | null>(null);

  const profileVoiceId = profile?.voice_classification_id ?? null;
  const isMember = status === "authenticated" && Boolean(profile);

  const pending = useQuery({
    queryKey: queryKeys.myVoiceRequest(profile?.id ?? "anonymous"),
    queryFn: () => getMyPendingRequest(profile!.id),
    enabled: isMember,
    staleTime: 15_000,
  });

  // One-time cleanup: adopt anything a guest chose under the old behaviour,
  // then stop keeping it. After this runs once per browser the key is gone.
  React.useEffect(() => {
    if (!isMember || !profile) return;
    const legacy = readStored();
    if (!legacy) return;

    if (!profileVoiceId && adoptedRef.current !== profile.id) {
      adoptedRef.current = profile.id;
      updateOwnProfile(profile.id, { voice_classification_id: legacy })
        .then(() => refreshProfile())
        .catch((error) => console.error("[dma_songs] could not adopt stored voice part", error));
    }
    writeStored(null);
  }, [isMember, profile, profileVoiceId, refreshProfile]);

  const myPartId = React.useMemo(() => {
    if (!isMember || !profileVoiceId) return null;
    // A part can be deactivated or deleted while a stale id sits on a profile.
    return parts.some((p) => p.id === profileVoiceId) ? profileVoiceId : null;
  }, [isMember, profileVoiceId, parts]);

  const choose = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      if (!isMember || !profile) {
        throw new Error("Sign in to choose your voice part.");
      }
      const requestId = await requestVoiceChange(id, note);
      // The database returns null when it applied the change outright, which
      // is what happens on a first choice.
      return { requestId, applied: requestId === null };
    },
    onSuccess: async (result, variables) => {
      const part = parts.find((p) => p.id === variables.id);
      if (result.applied) {
        await refreshProfile();
        toast.success(part ? `You're in ${part.name}` : "Voice part saved");
      } else {
        toast.success("Request sent", {
          description: `An administrator will review your move to ${part?.name ?? "the new part"}.`,
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.myVoiceRequest(profile?.id ?? "anonymous") });
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingVoiceRequests });
    },
    onError: (error) => toast.error(errorMessage(error, "That didn't go through.")),
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const request = pending.data;
      if (!request) throw new Error("There is no request to withdraw.");
      await cancelVoiceChangeRequest(request.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myVoiceRequest(profile?.id ?? "anonymous") });
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingVoiceRequests });
      toast.success("Request withdrawn");
    },
    onError: (error) => toast.error(errorMessage(error, "The request couldn't be withdrawn.")),
  });

  const value = React.useMemo<VoicePartState>(
    () => ({
      parts,
      myPartId,
      myPart: parts.find((p) => p.id === myPartId) ?? null,
      isFirstChoice: myPartId === null,
      pendingRequest: pending.data ?? null,
      isLoading,
      isSubmitting: choose.isPending || cancel.isPending,
      choosePart: async (id, note) => {
        await choose.mutateAsync({ id, note });
      },
      cancelRequest: async () => {
        await cancel.mutateAsync();
      },
      clear: () => {
        // Members cannot un-assign themselves; that is an administrator's call.
        writeStored(null);
      },
    }),
    [parts, myPartId, pending.data, isLoading, choose, cancel, isMember],
  );

  return <VoicePartContext.Provider value={value}>{children}</VoicePartContext.Provider>;
}

export function useVoicePart() {
  const context = React.useContext(VoicePartContext);
  if (!context) throw new Error("useVoicePart must be used inside <VoicePartProvider>.");
  return context;
}
