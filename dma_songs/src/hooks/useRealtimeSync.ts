import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthProvider";

/**
 * Keeps open devices in step with each other.
 *
 * The design here is "tell me something changed", not "tell me what changed".
 * A message only ever triggers a refetch of the affected queries; the payload
 * is never written into the cache. That costs one extra request but means a
 * device can never end up holding a row it would not have been allowed to
 * read — the refetch goes through the same policies as any other request, so
 * realtime cannot become a second, weaker way of getting at data.
 *
 * Only signed-in members subscribe. A visitor reading the landing page would
 * hold a connection slot for nothing, and the free tier's cap is a real limit
 * worth spending on people who are actually using the app.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const { status } = useAuth();

  React.useEffect(() => {
    if (status !== "authenticated") return;

    const channel = supabase
      .channel("dma-songs-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "songs" }, () => {
        // Both the member-facing list and the admin one, plus anything that
        // counts songs.
        queryClient.invalidateQueries({ queryKey: ["songs"] });
        queryClient.invalidateQueries({ queryKey: ["song"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "songs"] });
        queryClient.invalidateQueries({ queryKey: ["song-categories"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
        // Events live in this table too, so this covers both.
        queryClient.invalidateQueries({ queryKey: ["announcements"] });
        queryClient.invalidateQueries({ queryKey: ["announcement"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
        queryClient.invalidateQueries({ queryKey: ["events"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, status]);
}
