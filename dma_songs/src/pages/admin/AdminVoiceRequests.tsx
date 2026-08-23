import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Inbox, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Pagination } from "@/components/common/Pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { decideVoiceChange, listVoiceRequests } from "@/services/voiceRequests";
import { queryKeys } from "@/lib/queryKeys";
import { ADMIN_PAGE_SIZE } from "@/lib/constants";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, initials, relativeTime } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { VoiceChangeRequest, VoiceChangeRequestStatus } from "@/types/models";

type Decision = { request: VoiceChangeRequest; approve: boolean };

const STATUS_LOOK: Record<VoiceChangeRequestStatus, { label: string; variant: "success" | "warning" | "secondary" | "destructive" }> = {
  pending: { label: "Waiting", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Declined", variant: "destructive" },
  cancelled: { label: "Withdrawn", variant: "secondary" },
};

export default function AdminVoiceRequests() {
  useDocumentTitle("Voice part requests");
  const queryClient = useQueryClient();
  const [status, setStatus] = React.useState<VoiceChangeRequestStatus | "all">("pending");
  const [page, setPage] = React.useState(1);
  const [decision, setDecision] = React.useState<Decision | null>(null);
  const [note, setNote] = React.useState("");

  const params = { status, page, pageSize: ADMIN_PAGE_SIZE };
  const query = useQuery({
    queryKey: queryKeys.voiceRequests(params),
    queryFn: () => listVoiceRequests(params),
    placeholderData: (previous) => previous,
  });

  const decide = useMutation({
    mutationFn: ({ request, approve }: Decision) => decideVoiceChange(request.id, approve, note),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "voice-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      setDecision(null);
      setNote("");
      toast.success(
        variables.approve
          ? `Moved to ${variables.request.requested?.name ?? "the new part"}`
          : "Request declined",
      );
    },
    onError: (error) => toast.error(errorMessage(error, "The decision didn't save.")),
  });

  const rows = query.data?.rows ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Voice part requests"
        description="A member's first choice applies on its own. Any move afterwards waits here, so section balance stays a decision somebody makes."
      />

      <Tabs
        value={status}
        onValueChange={(value) => {
          setStatus(value as typeof status);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="pending">Waiting</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Declined</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {query.isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : query.isError ? (
        <ErrorState title="Requests didn't load" error={query.error} onRetry={query.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title={status === "pending" ? "Nothing waiting" : "Nothing here"}
          description={
            status === "pending"
              ? "When a member asks to change section, it appears here."
              : "No requests with that status yet."
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((request) => (
            <Card key={request.id}>
              <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {request.profile?.avatar_url ? (
                      <AvatarImage src={request.profile.avatar_url} alt="" />
                    ) : null}
                    <AvatarFallback>{initials(request.profile?.display_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {request.profile?.display_name || request.profile?.email || "Member"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{request.profile?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span
                    className="rounded-full border px-2.5 py-1 font-medium"
                    style={
                      request.current
                        ? { borderColor: request.current.color, color: request.current.color }
                        : undefined
                    }
                  >
                    {request.current?.name ?? "No part"}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span
                    className="rounded-full border-2 px-2.5 py-1 font-semibold"
                    style={
                      request.requested
                        ? {
                            borderColor: request.requested.color,
                            color: request.requested.color,
                            backgroundColor: `${request.requested.color}12`,
                          }
                        : undefined
                    }
                  >
                    {request.requested?.name}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  {request.note ? (
                    <p className="text-sm italic text-muted-foreground">“{request.note}”</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No note given.</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground" title={formatDateTime(request.created_at)}>
                    Asked {relativeTime(request.created_at)}
                  </p>
                </div>

                {request.status === "pending" ? (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setNote("");
                        setDecision({ request, approve: true });
                      }}
                    >
                      <Check aria-hidden /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNote("");
                        setDecision({ request, approve: false });
                      }}
                    >
                      <X aria-hidden /> Decline
                    </Button>
                  </div>
                ) : (
                  <div className="shrink-0 text-right">
                    <Badge variant={STATUS_LOOK[request.status].variant}>
                      {STATUS_LOOK[request.status].label}
                    </Badge>
                    {request.decision_note ? (
                      <p className="mt-1 max-w-[28ch] text-xs text-muted-foreground">
                        {request.decision_note}
                      </p>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        pageSize={ADMIN_PAGE_SIZE}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
        label="requests"
      />

      <Dialog open={Boolean(decision)} onOpenChange={(open) => !open && setDecision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision?.approve ? "Approve this move?" : "Decline this request?"}
            </DialogTitle>
            <DialogDescription>
              {decision?.approve ? (
                <>
                  <strong>{decision.request.profile?.display_name || decision.request.profile?.email}</strong>{" "}
                  will move from {decision.request.current?.name ?? "no part"} to{" "}
                  <strong>{decision.request.requested?.name}</strong> straight away.
                </>
              ) : (
                <>
                  <strong>{decision?.request.profile?.display_name || decision?.request.profile?.email}</strong>{" "}
                  stays in {decision?.request.current?.name ?? "their current part"}. They'll see your
                  reason, so it's worth writing one.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="decision-note">
              Note to the member {decision?.approve ? "(optional)" : ""}
            </Label>
            <Textarea
              id="decision-note"
              rows={3}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                decision?.approve
                  ? "Optional — e.g. welcome to the section."
                  : "e.g. let's revisit after the December concert."
              }
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDecision(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={decision?.approve ? "default" : "destructive"}
              loading={decide.isPending}
              onClick={() => decision && decide.mutate(decision)}
            >
              {decision?.approve ? "Approve the move" : "Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
