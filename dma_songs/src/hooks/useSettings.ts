import { useQuery } from "@tanstack/react-query";
import { loadSettings } from "@/services/settings";
import { queryKeys } from "@/lib/queryKeys";

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: loadSettings,
    staleTime: 10 * 60 * 1000,
  });
}
