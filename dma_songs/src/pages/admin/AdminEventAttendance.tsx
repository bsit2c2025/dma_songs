import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Check, Download, HelpCircle, Lock, Pencil, Plus, Trash2, UserPlus, X,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  addEventGuest, adminClearAttendance, adminSetAttendance, listEventGuests,
  listNonResponders, removeEventGuest,
} from "@/services/eventAdmin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { errorMessage } from "@/lib/errors";
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

  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<"replies" | "no_reply" | "guests">("replies");
  const [guestOpen, setGuestOpen] = React.useState(false);
  const [guestName, setGuestName] = React.useState("");
  const [guestRole, setGuestRole] = React.useState("");
  const [guestPart, setGuestPart] = React.useState<string | null>(null);

  const attendance = useQuery({
    queryKey: ["admin", "attendance", id],
    queryFn: () => listAttendance(id!),
    enabled: Boolean(id),
  });

  const nonResponders = useQuery({
    queryKey: ["admin", "non-responders", id],
    queryFn: () => listNonResponders(id!),
    enabled: Boolean(id),
  });

  const guests = useQuery({
    queryKey: ["admin", "event-guests", id],
    queryFn: () => listEventGuests(id!),
    enabled: Boolean(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "attendance", id] });
    queryClient.invalidateQueries({ queryKey: ["admin", "non-responders", id] });
    queryClient.invalidateQueries({ queryKey: ["admin", "event-guests", id] });
    queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
    queryClient.invalidateQueries({ queryKey: ["attendance-summary", id] });
  };

  const setStatus = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: AttendanceStatus }) =>
      adminSetAttendance(id!, userId, status),
    onSuccess: () => {
      invalidate();
      toast.success("Reply recorded");
    },
    onError: (error) => toast.error(errorMessage(error, "That didn't save.")),
  });

  const clearStatus = useMutation({
    mutationFn: (userId: string) => adminClearAttendance(id!, userId),
    onSuccess: () => {
      invalidate();
      toast.success("Reply cleared — it's theirs to answer again");
    },
    onError: (error) => toast.error(errorMessage(error, "That didn't save.")),
  });

  const addGuest = useMutation({
    mutationFn: () =>
      addEventGuest({
        announcement_id: id!,
        name: guestName.trim(),
        role: guestRole.trim() || null,
        voice_classification_id: guestPart,
      }),
    onSuccess: () => {
      invalidate();
      setGuestOpen(false);
      setGuestName("");
      setGuestRole("");
      setGuestPart(null);
      toast.success("Guest added");
    },
    onError: (error) => toast.error(errorMessage(error, "The guest wasn't added.")),
  });

  const dropGuest = useMutation({
    mutationFn: (guestId: string) => removeEventGuest(guestId),
    onSuccess: () => {
      invalidate();
      toast.success("Guest removed");
    },
    onError: (error) => toast.error(errorMessage(error, "That didn't work.")),
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

      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="replies" className="flex-1">
            Replies ({rows.length})
          </TabsTrigger>
          <TabsTrigger value="no_reply" className="flex-1">
            No reply ({nonResponders.data?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="guests" className="flex-1">
            Guests ({guests.data?.length ?? 0})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "replies" ? (
        attendance.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<HelpCircle />}
            title="Nobody has replied yet"
            description="Replies appear here as members respond, or when you record one for them."
          />
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {rows.map((row) => (
                <div key={row.user_id} className="flex flex-wrap items-center gap-3 p-4">
                  <Avatar className="h-9 w-9">
                    {row.profile?.avatar_url ? <AvatarImage src={row.profile.avatar_url} alt="" /> : null}
                    <AvatarFallback>{initials(row.profile?.display_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-medium">
                      {row.profile?.display_name || row.profile?.email}
                      {row.set_by_admin ? (
                        <span
                          className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold text-muted-foreground"
                          title="You recorded this, not them"
                        >
                          <Lock className="h-2.5 w-2.5" aria-hidden /> set by admin
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {parts.data?.find((p) => p.id === row.profile?.voice_classification_id)?.name ??
                        "No voice part"}
                      {row.note ? ` · “${row.note}”` : ""}
                      {row.admin_note ? ` · ${row.admin_note}` : ""}
                    </p>
                  </div>

                  <Select
                    value={row.status}
                    onValueChange={(value) =>
                      setStatus.mutate({ userId: row.user_id, status: value as AttendanceStatus })
                    }
                  >
                    <SelectTrigger className="h-9 w-36" aria-label={`Status for ${row.profile?.display_name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="going">Going</SelectItem>
                      <SelectItem value="maybe">Not sure</SelectItem>
                      <SelectItem value="not_going">Can't go</SelectItem>
                    </SelectContent>
                  </Select>

                  {row.set_by_admin ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Clear this and let them answer for themselves"
                      aria-label="Clear this reply"
                      onClick={() => clearStatus.mutate(row.user_id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        )
      ) : null}

      {tab === "no_reply" ? (
        nonResponders.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : nonResponders.data?.length === 0 ? (
          <EmptyState
            icon={<Check />}
            title="Everybody has answered"
            description="Every approved member has a reply on record for this event."
          />
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {(nonResponders.data ?? []).map((person) => (
                <div key={person.id} className="flex flex-wrap items-center gap-3 p-4">
                  <Avatar className="h-9 w-9">
                    {person.avatar_url ? <AvatarImage src={person.avatar_url} alt="" /> : null}
                    <AvatarFallback>{initials(person.display_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{person.display_name || person.email}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {parts.data?.find((p) => p.id === person.voice_classification_id)?.name ??
                        "No voice part"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus.mutate({ userId: person.id, status: "going" })}
                    >
                      <Check aria-hidden /> Going
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setStatus.mutate({ userId: person.id, status: "not_going" })}
                    >
                      <X aria-hidden /> Can't
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      ) : null}

      {tab === "guests" ? (
        <div className="space-y-3">
          <Button onClick={() => setGuestOpen(true)}>
            <UserPlus aria-hidden /> Add a guest singer
          </Button>

          {guests.data?.length ? (
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {guests.data.map((guest) => (
                  <div key={guest.id} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{guest.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[
                          guest.role,
                          parts.data?.find((p) => p.id === guest.voice_classification_id)?.name,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Guest"}
                      </p>
                    </div>
                    <Badge variant="success">Going</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${guest.name}`}
                      onClick={() => dropGuest.mutate(guest.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={<UserPlus />}
              title="No guests"
              description="Alumni and guest singers who don't have an account can be listed here."
            />
          )}
        </div>
      ) : null}

      <Dialog open={guestOpen} onOpenChange={setGuestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a guest singer</DialogTitle>
            <DialogDescription>
              For an alum or visiting singer with no account. They appear on the call sheet without
              needing to sign up for anything.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="guest-name">Name</Label>
              <Input
                id="guest-name"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guest-role">Role or affiliation</Label>
              <Input
                id="guest-role"
                placeholder="Alumnus, batch 2019"
                value={guestRole}
                onChange={(event) => setGuestRole(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guest-part">Voice part</Label>
              <Select value={guestPart ?? "none"} onValueChange={(v) => setGuestPart(v === "none" ? null : v)}>
                <SelectTrigger id="guest-part">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {(parts.data ?? []).map((part) => (
                    <SelectItem key={part.id} value={part.id}>
                      {part.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGuestOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={addGuest.isPending}
              disabled={!guestName.trim()}
              onClick={() => addGuest.mutate()}
            >
              <Plus aria-hidden /> Add guest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
