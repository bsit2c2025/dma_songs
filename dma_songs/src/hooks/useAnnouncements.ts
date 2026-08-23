import { useQuery } from "@tanstack/react-query";
import {
  getAnnouncement,
  listAnnouncementsForAdmin,
  listLiveAnnouncements,
  type AnnouncementListParams,
} from "@/services/announcements";
import { queryKeys } from "@/lib/queryKeys";

export function useLiveAnnouncements(limit?: number) {
  return useQuery({
    queryKey: queryKeys.announcements({ live: true, limit }),
    queryFn: () => listLiveAnnouncements(limit),
    staleTime: 60 * 1000,
  });
}

export function useAdminAnnouncements(params: AnnouncementListParams) {
  return useQuery({
    queryKey: queryKeys.adminAnnouncements(params),
    queryFn: () => listAnnouncementsForAdmin(params),
    placeholderData: (previous) => previous,
  });
}

export function useAnnouncement(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.announcement(id ?? "none"),
    queryFn: () => getAnnouncement(id!),
    enabled: Boolean(id),
  });
}
