import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Download, HelpCircle, X } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAnnouncement } from "@/hooks/useAnnouncements";
import { useVoiceClassifications } from "@/hooks/useVoiceClassifications";
import { listAttendance, type AttendanceStatus } from "@/services/events";
import { formatDateTime, initials } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const LOOK: Record<AttendanceStatus, { label: string; variant: "success" | "warning" | "destructive" }> = {
  going: { label: "Going", variant: "success" },
  maybe: { label: "Not sure", variant: "warning" },
  not_going: { label: "Can't go", variant: "destructive" },
};

export default function AdminEventAttendance() {
  const { id } = useParams<{ id: string }>();
  const event = useAnnouncement(id);
  const parts = useVoiceClassifications(true);
  useDocumentTitle("Attendance");

  const attendance = useQuery({
    queryKey: ["admin", "attendance", id],
    queryFn: () => listAttendance(id!),
    enabled: Boolean(id),
  });

  const rows = attendance.data ?? [];
  const counts = {
    going: rows.filter((r) => r.status === "going").length,
    maybe: rows.filter((r) => r.status === "maybe").length,
    not_going: rows.filter((r) => r.status === "not_going").length,
  };

  /** Section balance is the thing a director actually needs from this list. */
  const bySection = (parts.data ?? []).map((part) => ({
    part,
    going: rows.filter((r) => r.status === "going" && r.profile?.voice_classification_id === part.id)
      .length,
  }));

  function exportCsv() {
    const header = "Name,Email,Voice part,Status,Note\n";
    const body = rows
      .map((row) => {
        const part = parts.data?.find((p) => p.id === row.profile?.voice_classification_id)?.name ?? "";
        const cells = [
          row.profile?.display_name ?? "",
          row.profile?.email ?? "",
          part,
          LOOK[row.status].label,
          row.note ?? "",
        ];
        return cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",");
      })
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${event.data?.title ?? "event"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (event.isLoading) return <Skeleton className="h-96 w-full" />;
  if (event.isError) {
    return <ErrorState title="That event didn't load" error={event.error} onRetry={event.refetch} />;
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to={`/admin/announcements/${id}/edit`}>
          <ArrowLeft aria-hidden /> Back to the event
        </Link>
      </Button>

      <PageHeader
        eyebrow="Event"
        title={event.data?.title ?? "Attendance"}
        description={
          event.data?.event_starts_at
            ? `${formatDateTime(event.data.event_starts_at)}${event.data.venue ? ` · ${event.data.venue}` : ""}`
            : undefined
        }
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            <Download aria-hidden /> Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
              <Check className="h-3 w-3" aria-hidden /> Going
            </p>
            <p className="mt-1 font-display text-3xl">{counts.going}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
              <HelpCircle className="h-3 w-3" aria-hidden /> Not sure
            </p>
            <p className="mt-1 font-display text-3xl">{counts.maybe}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
              <X className="h-3 w-3" aria-hidden /> Can't go
            </p>
            <p className="mt-1 font-display text-3xl">{counts.not_going}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Who's coming, by section
          </h2>
          {bySection.map(({ part, going }) => (
            <div key={part.id} className="flex items-center justify-between text-sm">
              <span className="font-medium" style={{ color: part.color }}>
                {part.name}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{going} going</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {attendance.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<HelpCircle />}
          title="Nobody has replied yet"
          description="Replies appear here as members respond on the home page."
        />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {rows.map((row) => (
              <div key={row.user_id} className="flex items-center gap-3 p-4">
                <Avatar className="h-9 w-9">
                  {row.profile?.avatar_url ? <AvatarImage src={row.profile.avatar_url} alt="" /> : null}
                  <AvatarFallback>{initials(row.profile?.display_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{row.profile?.display_name || row.profile?.email}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {parts.data?.find((p) => p.id === row.profile?.voice_classification_id)?.name ??
                      "No voice part"}
                    {row.note ? ` · “${row.note}”` : ""}
                  </p>
                </div>
                <Badge variant={LOOK[row.status].variant}>{LOOK[row.status].label}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
