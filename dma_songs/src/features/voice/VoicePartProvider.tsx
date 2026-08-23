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
 * with an administrator's approval. It is deliberately no longer the same
 * thing as the library filter: browsing another section's music is useful and
 * harmless, so the filter lives in the page's URL and this provider only
 * tracks who you actually are.
 *
 * Guests have nobody to approve them, so their choice stays in localStorage
 * and is adopted onto their profile the first time they sign in.
 */
export function VoicePartProvider({ children }: { children: React.ReactNode }) {
  const { data: parts = [], isLoading } = useVoiceClassifications();
  const { profile, status, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [guestId, setGuestId] = React.useState<string | null>(() => readStored());
  const adoptedRef = React.useRef<string | null>(null);

  const profileVoiceId = profile?.voice_classification_id ?? null;
  const isMember = status === "authenticated" && Boolean(profile);

  const pending = useQuery({
    queryKey: queryKeys.myVoiceRequest(profile?.id ?? "anonymous"),
    queryFn: () => getMyPendingRequest(profile!.id),
    enabled: isMember,
    staleTime: 15_000,
  });

  // Adopt a guest's choice onto their profile the first time they sign in.
  React.useEffect(() => {
    if (!isMember || !profile) return;
    if (profileVoiceId) {
      writeStored(profileVoiceId);
      return;
    }
    if (guestId && adoptedRef.current !== profile.id) {
      adoptedRef.current = profile.id;
      updateOwnProfile(profile.id, { voice_classification_id: guestId })
        .then(() => refreshProfile())
        .catch((error) => console.error("[dma_songs] could not adopt guest voice part", error));
    }
  }, [isMember, profile, profileVoiceId, guestId, refreshProfile]);

  const myPartId = React.useMemo(() => {
    const candidate = isMember ? profileVoiceId : guestId;
    if (!candidate) return null;
    // A part can be deactivated or deleted while a stale id sits in storage.
    return parts.some((p) => p.id === candidate) ? candidate : null;
  }, [isMember, profileVoiceId, guestId, parts]);

  const choose = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      // Guests have no profile to move and nobody to ask.
      if (!isMember || !profile) {
        setGuestId(id);
        writeStored(id);
        return { requestId: null as string | null, applied: true };
      }
      const requestId = await requestVoiceChange(id, note);
      // The database returns null when it applied the change outright, which
      // is what happens on a first choice.
      return { requestId, applied: requestId === null };
    },
    onSuccess: async (result, variables) => {
      const part = parts.find((p) => p.id === variables.id);
      if (result.applied) {
        writeStored(variables.id);
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
        if (isMember) return; // members cannot un-assign themselves
        setGuestId(null);
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
