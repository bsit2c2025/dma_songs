import * as React from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";

/**
 * When the cache last finished updating, and a way to force it.
 *
 * Live updates cover the common case, but a phone that has been asleep on a
 * patchy connection can still be behind. Saying plainly how old the data is
 * beats a silent guess, and the button is there for the moment somebody does
 * not trust what they are looking at.
 */
export function useDataFreshness() {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching() > 0;
  const [updatedAt, setUpdatedAt] = React.useState<number>(() => Date.now());
  // Re-render on a timer so "2 minutes ago" does not sit there saying "just now".
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    if (!isFetching) setUpdatedAt(Date.now());
  }, [isFetching]);

  React.useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 20_000);
    return () => window.clearInterval(timer);
  }, []);

  const refresh = React.useCallback(() => {
    // Only what is on screen. Refetching the whole cache would pull down pages
    // nobody is looking at, which on mobile data is somebody's money.
    void queryClient.refetchQueries({ type: "active" });
  }, [queryClient]);

  return { updatedAt, isFetching, refresh };
}
