import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Lock, Settings2, ShieldCheck, ShieldOff, UserRound, Users, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Pagination } from "@/components/common/Pagination";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { VoicePartChip } from "@/components/common/VoicePartChip";
import { MemberSheet } from "@/components/common/MemberSheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { listMembers, setAdminRole, setMemberActive, setMemberVoiceClassification } from "@/services/members";
import { listPendingMembers, listSuperAdminIds, setMemberApproval } from "@/services/membership";
import { useVoiceClassifications } from "@/hooks/useVoiceClassifications";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAuth } from "@/features/auth/AuthProvider";
import { queryKeys } from "@/lib/queryKeys";
import { ADMIN_PAGE_SIZE } from "@/lib/constants";
import { errorMessage } from "@/lib/errors";
import { formatDate, initials } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { MemberSummary } from "@/types/models";

const ALL = "__all__";
const NONE = "__none__";

export default function AdminUsers() {
  useDocumentTitle("Members");
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [partId, setPartId] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [pendingAdmin, setPendingAdmin] = React.useState<{ member: MemberSummary; grant: boolean } | null>(null);
  const [managing, setManaging] = React.useState<MemberSummary | null>(null);

  const pending = useQuery({ queryKey: ["admin", "pending-members"], queryFn: listPendingMembers });
  const superAdmins = useQuery({ queryKey: ["admin", "super-admins"], queryFn: listSuperAdminIds });
  const protectedIds = new Set(superAdmins.data ?? []);

  const approve = useMutation({
    mutationFn: ({ id, ok }: { id: string; ok: boolean }) => setMemberApproval(id, ok),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "pending-members"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "pending-member-count"] });
      toast.success(variables.ok ? "Member approved" : "Request declined");
    },
    onError: (error) => toast.error(errorMessage(error, "That didn't save.")),
  });

  const parts = useVoiceClassifications(true);
  const params = {
    search: debouncedSearch,
    voiceClassificationId: partId,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
  const query = useQuery({
    queryKey: queryKeys.members(params),
    queryFn: () => listMembers(params),
    placeholderData: (previous) => previous,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  };

  const changeVoice = useMutation({
    mutationFn: ({ id, voiceId }: { id: string; voiceId: string | null }) =>
      setMemberVoiceClassification(id, voiceId),
    onSuccess: () => {
      invalidate();
      toast.success("Voice part updated");
    },
    onError: (error) => toast.error(errorMessage(error, "That change didn't save.")),
  });

  const [deactivating, setDeactivating] = React.useState<MemberSummary | null>(null);
  const [reason, setReason] = React.useState("");

  const changeActive = useMutation({
    mutationFn: ({ id, active, why }: { id: string; active: boolean; why?: string }) =>
      setMemberActive(id, active, why),
    onSuccess: (_data, variables) => {
      invalidate();
      setDeactivating(null);
      setReason("");
      toast.success(variables.active ? "Member reactivated" : "Member deactivated");
    },
    onError: (error) => toast.error(errorMessage(error, "That change didn't save.")),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, grant }: { id: string; grant: boolean }) => setAdminRole(id, grant),
    onSuccess: (_data, variables) => {
      invalidate();
      setPendingAdmin(null);
      toast.success(variables.grant ? "Administrator access granted" : "Administrator access removed");
    },
    onError: (error) => toast.error(errorMessage(error, "The role couldn't be changed.")),
  });

  const rows = query.data?.rows ?? [];
  const amSuperAdmin = protectedIds.has(user?.id ?? "");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Members"
        description="Everyone with an account. Passwords are never stored or shown here — authentication is handled by Supabase."
      />

      {pending.data?.length ? (
        <Card className="border-brass/50">
          <CardContent className="space-y-3 p-5">
            <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-brass">
              Waiting for approval — {pending.data.length}
            </h2>
            <p className="text-sm text-muted-foreground">
              These accounts have signed up but can't reach the music yet.
            </p>
            {pending.data.map((person) => (
              <div
                key={person.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3"
              >
                <Avatar className="h-9 w-9">
                  {person.avatar_url ? <AvatarImage src={person.avatar_url} alt="" /> : null}
                  <AvatarFallback>{initials(person.display_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{person.display_name || "New member"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {person.email} · signed up {formatDate(person.created_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={approve.isPending}
                    onClick={() => approve.mutate({ id: person.id, ok: true })}
                  >
                    <Check aria-hidden /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={approve.isPending}
                    onClick={() => approve.mutate({ id: person.id, ok: false })}
                  >
                    <X aria-hidden /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput
          id="member-search"
          label="Search members"
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by name or email…"
          className="flex-1"
        />
        <Select
          value={partId ?? ALL}
          onValueChange={(value) => {
            setPartId(value === ALL ? null : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-56" aria-label="Filter by voice part">
            <SelectValue placeholder="All voice parts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All voice parts</SelectItem>
            {(parts.data ?? []).map((part) => (
              <SelectItem key={part.id} value={part.id}>
                {part.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : query.isError ? (
        <ErrorState title="The member list didn't load" error={query.error} onRetry={query.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={debouncedSearch ? "No members matched your search" : "No members yet"}
          description="Members appear here once they create an account."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Voice part</TableHead>
                  <TableHead className="hidden lg:table-cell">Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Joined</TableHead>
                  <TableHead className="w-12 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((member) => {
                  const isSelf = member.id === user?.id;
                  const isAdminMember = member.roles.includes("admin");
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            {member.avatar_url ? <AvatarImage src={member.avatar_url} alt="" /> : null}
                            <AvatarFallback>{initials(member.display_name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 font-semibold">
                              <span className="truncate">{member.display_name || "Member"}</span>
                              {isAdminMember ? (
                                <Badge className="bg-brass text-brass-foreground">Admin</Badge>
                              ) : null}
                              {protectedIds.has(member.id) ? (
                                <Badge variant="secondary" title="Protected account">
                                  <Lock className="h-3 w-3" aria-hidden /> Protected
                                </Badge>
                              ) : null}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={member.voice_classification_id ?? NONE}
                          onValueChange={(value) =>
                            changeVoice.mutate({ id: member.id, voiceId: value === NONE ? null : value })
                          }
                        >
                          <SelectTrigger
                            className="h-9 w-44"
                            aria-label={`Voice part for ${member.display_name || member.email}`}
                          >
                            <SelectValue placeholder="Not set" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>Not set</SelectItem>
                            {(parts.data ?? []).map((part) => (
                              <SelectItem key={part.id} value={part.id}>
                                {part.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {member.voiceClassification ? (
                          <div className="mt-1 lg:hidden">
                            <VoicePartChip part={member.voiceClassification} />
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant={member.is_active ? "success" : "secondary"}>
                          {member.is_active ? "Active" : "Deactivated"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground xl:table-cell">
                        {formatDate(member.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Actions for ${member.display_name}`}>
                              <UserRound />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Manage</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => setManaging(member)}>
                              <Settings2 aria-hidden /> Name, note, password, erase…
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={isSelf || (protectedIds.has(member.id) && !amSuperAdmin)}
                              onSelect={() => {
                                if (member.is_active) {
                                  setReason("");
                                  setDeactivating(member);
                                } else {
                                  changeActive.mutate({ id: member.id, active: true });
                                }
                              }}
                            >
                              {member.is_active ? "Deactivate account" : "Reactivate account"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={isSelf || (protectedIds.has(member.id) && !amSuperAdmin)}
                              destructive={isAdminMember}
                              onSelect={() => setPendingAdmin({ member, grant: !isAdminMember })}
                            >
                              {isAdminMember ? (
                                <>
                                  <ShieldOff aria-hidden /> Remove administrator
                                </>
                              ) : (
                                <>
                                  <ShieldCheck aria-hidden /> Make administrator
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Pagination
        page={page}
        pageSize={ADMIN_PAGE_SIZE}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
        label="members"
      />

      <Dialog open={Boolean(deactivating)} onOpenChange={(open) => !open && setDeactivating(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Deactivate {deactivating?.display_name || deactivating?.email}?
            </DialogTitle>
            <DialogDescription>
              They keep their account but lose the music library and events. They will be shown the
              reason you give here, so write it for them rather than for your own notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="deactivation-reason">Reason</Label>
            <Textarea
              id="deactivation-reason"
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="On leave for the semester. Message the director when you're back."
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeactivating(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={changeActive.isPending}
              disabled={!reason.trim()}
              onClick={() =>
                deactivating &&
                changeActive.mutate({ id: deactivating.id, active: false, why: reason })
              }
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MemberSheet
        member={managing}
        open={Boolean(managing)}
        onOpenChange={(open) => !open && setManaging(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingAdmin)}
        onOpenChange={(open) => !open && setPendingAdmin(null)}
        title={pendingAdmin?.grant ? "Grant administrator access?" : "Remove administrator access?"}
        destructive={!pendingAdmin?.grant}
        confirmLabel={pendingAdmin?.grant ? "Grant access" : "Remove access"}
        loading={changeRole.isPending}
        onConfirm={() =>
          pendingAdmin && changeRole.mutate({ id: pendingAdmin.member.id, grant: pendingAdmin.grant })
        }
        description={
          pendingAdmin?.grant ? (
            <span>
              <strong>{pendingAdmin.member.display_name || pendingAdmin.member.email}</strong> will be able
              to add, edit and delete songs, announcements and members.
            </span>
          ) : (
            <span>
              <strong>{pendingAdmin?.member.display_name || pendingAdmin?.member.email}</strong> will keep
              their account but lose all dashboard access. The last remaining administrator can't be removed.
            </span>
          )
        }
      />
    </div>
  );
}
