import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, Clock, HelpCircle, MapPin, Shirt, Backpack, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RichText } from "@/components/common/RichText";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  attendanceSummary, getMyAttendance, setMyAttendance, type AttendanceStatus,
} from "@/services/events";
import { errorMessage } from "@/lib/errors";
import { cn, formatDateTime } from "@/lib/utils";
import type { Announcement } from "@/types/models";

const CHOICES: { value: AttendanceStatus; label: string; icon: React.ReactNode }[] = [
  { value: "going", label: "I'm going", icon: <Check className="h-4 w-4" aria-hidden /> },
  { value: "maybe", label: "Not sure", icon: <HelpCircle className="h-4 w-4" aria-hidden /> },
  { value: "not_going", label: "Can't go", icon: <X className="h-4 w-4" aria-hidden /> },
];

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-brass" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

/**
 * An event, with everything a singer needs to turn up in the right clothes at
 * the right place — and the one question worth asking them back.
 */
export function EventCard({ event, compact = false }: { event: Announcement; compact?: boolean }) {
  const { user, status } = useAuth();
  const queryClient = useQueryClient();
  const isMember = status === "authenticated" && Boolean(user);

  const mine = useQuery({
    queryKey: ["attendance", event.id, user?.id],
    queryFn: () => getMyAttendance(event.id, user!.id),
    enabled: isMember && event.collect_rsvp,
  });

  const summary = useQuery({
    queryKey: ["attendance-summary", event.id],
    queryFn: () => attendanceSummary(event.id),
    enabled: event.collect_rsvp,
  });

  const respond = useMutation({
    mutationFn: (next: AttendanceStatus) => setMyAttendance(event.id, user!.id, next),
    onSuccess: (_data, next) => {
      queryClient.invalidateQueries({ queryKey: ["attendance", event.id] });
      queryClient.invalidateQueries({ queryKey: ["attendance-summary", event.id] });
      toast.success(
        next === "going" ? "See you there" : next === "maybe" ? "Marked as not sure" : "Thanks for letting us know",
      );
    },
    onError: (error) => toast.error(errorMessage(error, "That didn't save.")),
  });

  const start = event.event_starts_at ? new Date(event.event_starts_at) : null;
  const isPast = start ? start.getTime() < Date.now() : false;

  return (
    <Card className={cn("overflow-hidden", event.is_pinned && "border-brass/50")}>
      {start ? (
        <div className="flex items-center gap-3 border-b border-border bg-primary/5 px-5 py-3">
          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="font-mono text-[0.6rem] uppercase leading-none">
              {start.toLocaleDateString(undefined, { month: "short" })}
            </span>
            <span className="font-display text-xl leading-tight">{start.getDate()}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{event.title}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(event.event_starts_at!)}
              {isPast ? " · already happened" : ""}
            </p>
          </div>
          {event.is_pinned ? <Badge className="ml-auto bg-brass text-brass-foreground">Pinned</Badge> : null}
        </div>
      ) : null}

      <CardContent className="space-y-4 p-5">
        {!compact ? <RichText html={event.content} className="prose-announcement" /> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {event.call_time ? (
            <Detail icon={<Clock className="h-4 w-4" />} label="Call time" value={event.call_time} />
          ) : null}
          {event.venue ? (
            <Detail
              icon={<MapPin className="h-4 w-4" />}
              label="Where"
              value={event.address ? `${event.venue} — ${event.address}` : event.venue}
            />
          ) : null}
          {event.dress_code ? (
            <Detail icon={<Shirt className="h-4 w-4" />} label="What to wear" value={event.dress_code} />
          ) : null}
          {event.what_to_bring ? (
            <Detail icon={<Backpack className="h-4 w-4" />} label="Bring" value={event.what_to_bring} />
          ) : null}
          {event.event_ends_at ? (
            <Detail
              icon={<CalendarDays className="h-4 w-4" />}
              label="Ends"
              value={formatDateTime(event.event_ends_at)}
            />
          ) : null}
        </div>

        {event.collect_rsvp ? (
          <div className="space-y-2 border-t border-border pt-4">
            {isMember ? (
              <>
                <p className="text-sm font-medium">
                  {isPast ? "Were you there?" : "Are you coming?"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {CHOICES.map((choice) => {
                    const active = mine.data?.status === choice.value;
                    return (
                      <Button
                        key={choice.value}
                        size="sm"
                        variant={active ? "default" : "outline"}
                        disabled={respond.isPending}
                        onClick={() => respond.mutate(choice.value)}
                      >
                        {choice.icon} {choice.label}
                      </Button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Members can say whether they're coming once signed in.
              </p>
            )}

            {summary.data && summary.data.total > 0 ? (
              <p className="text-xs text-muted-foreground">
                {summary.data.going} going · {summary.data.maybe} not sure ·{" "}
                {summary.data.not_going} can't
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
