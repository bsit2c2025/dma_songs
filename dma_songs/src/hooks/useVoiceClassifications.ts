import { useQuery } from "@tanstack/react-query";
import { listVoiceClassifications } from "@/services/voiceClassifications";
import { queryKeys } from "@/lib/queryKeys";

export function useVoiceClassifications(includeInactive = false) {
  return useQuery({
    queryKey: [...queryKeys.voiceClassifications, includeInactive],
    queryFn: () => listVoiceClassifications(includeInactive),
    staleTime: 10 * 60 * 1000,
  });
}
