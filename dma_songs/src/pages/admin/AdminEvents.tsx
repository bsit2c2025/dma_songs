import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CalendarPlus, MapPin, Users } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listAdminEvents } from "@/services/eventAdmin";
import { formatDateTime } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function AdminEvents() {
  useDocumentTitle("Events");
  const [scope, setScope] = React.useState<"upcoming" | "all">("upcoming");

  const query = useQuery({
    queryKey: ["admin", "events", scope],
    queryFn: () => listAdminEvents(scope === "all"),
  });

  const rows = query.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title="Events"
        description="Every rehearsal and performance, with who has replied and who hasn't."
        actions={
          <Button asChild>
            <Link to="/admin/announcements/new">
              <CalendarPlus aria-hidden /> New event
            </Link>
          </Button>
        }
      />

      <Tabs value={scope} onValueChange={(value) => setScope(value as typeof scope)}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="all">Including past</TabsTrigger>
        </TabsList>
      </Tabs>

      {query.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState title="Events didn't load" error={query.error} onRetry={query.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title={scope === "upcoming" ? "Nothing coming up" : "No events yet"}
          description="An announcement becomes an event once you give it a date."
          action={
            <Button asChild>
              <Link to="/admin/announcements/new">
                <CalendarPlus aria-hidden /> New event
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((event) => {
            const past = event.event_starts_at
              ? new Date(event.event_starts_at).getTime() < Date.now()
              : false;
            return (
              <Card key={event.id} className={past ? "opacity-70" : undefined}>
                <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/admin/events/${event.id}`}
                        className="font-semibold hover:text-primary"
                      >
                        {event.title}
                      </Link>
                      {!event.is_published ? <Badge variant="secondary">Draft</Badge> : null}
                      {past ? <Badge variant="secondary">Past</Badge> : null}
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {event.event_starts_at ? (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" aria-hidden />
                          {formatDateTime(event.event_starts_at)}
                        </span>
                      ) : null}
                      {event.venue ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" aria-hidden />
                          {event.venue}
                        </span>
                      ) : null}
                    </p>
                  </div>

                  {event.collect_rsvp ? (
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="rounded-md bg-success/10 px-2.5 py-1 font-semibold text-success">
                        {event.going} going
                      </span>
                      <span className="rounded-md bg-muted px-2.5 py-1 text-muted-foreground">
                        {event.maybe} not sure
                      </span>
                      <span className="rounded-md bg-muted px-2.5 py-1 text-muted-foreground">
                        {event.not_going} can't
                      </span>
                      {/* The number that actually needs doing something about. */}
                      <span
                        className={
                          event.no_reply > 0
                            ? "rounded-md bg-brass/15 px-2.5 py-1 font-semibold text-brass"
                            : "rounded-md bg-muted px-2.5 py-1 text-muted-foreground"
                        }
                      >
                        {event.no_reply} no reply
                      </span>
                      {event.guests > 0 ? (
                        <span className="rounded-md bg-muted px-2.5 py-1 text-muted-foreground">
                          +{event.guests} guest{event.guests === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Replies not collected</span>
                  )}

                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    <Link to={`/admin/events/${event.id}`}>
                      <Users aria-hidden /> Manage
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
