import { useQuery } from "@tanstack/react-query";
import { Check, Clock, X } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { listMyRequests } from "@/services/voiceRequests";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import type { VoiceChangeRequestStatus } from "@/types/models";

const LOOK: Record<
  VoiceChangeRequestStatus,
  { label: string; variant: "success" | "warning" | "secondary" | "destructive"; icon: JSX.Element }
> = {
  pending: { label: "Waiting", variant: "warning", icon: <Clock className="h-3 w-3" aria-hidden /> },
  approved: { label: "Approved", variant: "success", icon: <Check className="h-3 w-3" aria-hidden /> },
  rejected: { label: "Declined", variant: "destructive", icon: <X className="h-3 w-3" aria-hidden /> },
  cancelled: { label: "Withdrawn", variant: "secondary", icon: <X className="h-3 w-3" aria-hidden /> },
};

/** The member's own record of what they asked for and what was decided. */
export function VoiceRequestHistory() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["voice-request", "history", user?.id],
    queryFn: () => listMyRequests(user!.id),
    enabled: Boolean(user?.id),
  });

  if (query.isLoading) return <Skeleton className="h-16 w-full" />;
  if (!query.data?.length) return null;

  return (
    <div>
      <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
        Your requests
      </h3>
      <ul className="divide-y divide-border rounded-md border border-border">
        {query.data.map((request) => {
          const look = LOOK[request.status];
          return (
            <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
              <span>
                {request.current?.name ?? "No part"} → <strong>{request.requested?.name}</strong>
                <span className="ml-2 text-xs text-muted-foreground">{formatDate(request.created_at)}</span>
                {request.decision_note ? (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Administrator's note: {request.decision_note}
                  </span>
                ) : null}
              </span>
              <Badge variant={look.variant}>
                {look.icon} {look.label}
              </Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
