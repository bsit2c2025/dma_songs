import { useQuery } from "@tanstack/react-query";
import { getSong, listCategories, listSongs, type SongListParams } from "@/services/songs";
import { queryKeys } from "@/lib/queryKeys";

export function useSongs(params: SongListParams) {
  return useQuery({
    queryKey: params.includeDisabled ? queryKeys.adminSongs(params) : queryKeys.songs(params),
    queryFn: () => listSongs(params),
    placeholderData: (previous) => previous,
    staleTime: 10 * 1000,
  });
}

export function useSong(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.song(id ?? "none"),
    queryFn: () => getSong(id!),
    enabled: Boolean(id),
  });
}

export function useSongCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: listCategories,
    staleTime: 5 * 60 * 1000,
  });
}
