import * as React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Megaphone, MoreHorizontal, Pencil, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Pagination } from "@/components/common/Pagination";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminAnnouncements } from "@/hooks/useAnnouncements";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { deleteAnnouncement, setAnnouncementFlags } from "@/services/announcements";
import { errorMessage } from "@/lib/errors";
import { ADMIN_PAGE_SIZE } from "@/lib/constants";
import { formatDateTime, stripHtml } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { Announcement } from "@/types/models";

export default function AdminAnnouncements() {
  useDocumentTitle("Announcements");
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = React.useState<"all" | "published" | "draft">("all");
  const [page, setPage] = React.useState(1);
  const [pendingDelete, setPendingDelete] = React.useState<Announcement | null>(null);

  const query = useAdminAnnouncements({
    search: debouncedSearch,
    status,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  };

  const flags = useMutation({
    mutationFn: ({ id, next }: { id: string; next: { is_published?: boolean; is_pinned?: boolean } }) =>
      setAnnouncementFlags(id, next),
    onSuccess: (_data, variables) => {
      invalidate();
      if (variables.next.is_published !== undefined) {
        toast.success(variables.next.is_published ? "Published" : "Unpublished");
      } else {
        toast.success(variables.next.is_pinned ? "Pinned to the top" : "Unpinned");
      }
    },
    onError: (error) => toast.error(errorMessage(error, "That change didn't save.")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: () => {
      invalidate();
      setPendingDelete(null);
      toast.success("Announcement deleted");
    },
    onError: (error) => toast.error(errorMessage(error, "It couldn't be deleted.")),
  });

  const rows = query.data?.rows ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title="Announcements"
        description="Post rehearsal calls and news. Scheduling and pinning control what members see on the home page."
        actions={
          <Button asChild>
            <Link to="/admin/announcements/new">
              <Plus aria-hidden /> New announcement
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          id="announcement-search"
          label="Search announcements"
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by title…"
          className="flex-1"
        />
        <Tabs
          value={status}
          onValueChange={(value) => {
            setStatus(value as typeof status);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : query.isError ? (
        <ErrorState title="Announcements didn't load" error={query.error} onRetry={query.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Megaphone />}
          title={debouncedSearch ? "Nothing matched your search" : "No announcements yet"}
          description={
            debouncedSearch
              ? `Nothing matches "${debouncedSearch}".`
              : "Post a rehearsal call and it appears at the top of the home page."
          }
          action={
            debouncedSearch ? (
              <Button variant="outline" onClick={() => setSearch("")}>
                Clear the search
              </Button>
            ) : (
              <Button asChild>
                <Link to="/admin/announcements/new">
                  <Plus aria-hidden /> New announcement
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Announcement</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Schedule</TableHead>
                  <TableHead className="hidden xl:table-cell">Priority</TableHead>
                  <TableHead className="w-12 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {announcement.is_pinned ? (
                          <Pin className="h-3.5 w-3.5 shrink-0 text-brass" aria-label="Pinned" />
                        ) : null}
                        <Link
                          to={`/admin/announcements/${announcement.id}/edit`}
                          className="font-semibold hover:text-primary"
                        >
                          {announcement.title}
                        </Link>
                      </div>
                      <p className="max-w-[46ch] truncate text-xs text-muted-foreground">
                        {stripHtml(announcement.content, 90)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {announcement.is_published ? (
                        announcement.isLive ? (
                          <Badge variant="success">Live</Badge>
                        ) : (
                          <Badge variant="warning">Scheduled</Badge>
                        )
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                      {announcement.starts_at || announcement.ends_at ? (
                        <>
                          {announcement.starts_at ? `From ${formatDateTime(announcement.starts_at)}` : "Now"}
                          <br />
                          {announcement.ends_at ? `Until ${formatDateTime(announcement.ends_at)}` : "No end date"}
                        </>
                      ) : (
                        "Always"
                      )}
                    </TableCell>
                    <TableCell className="hidden font-mono text-sm xl:table-cell">
                      {announcement.priority}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${announcement.title}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/announcements/${announcement.id}/edit`}>
                              <Pencil aria-hidden /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              flags.mutate({
                                id: announcement.id,
                                next: { is_published: !announcement.is_published },
                              })
                            }
                          >
                            {announcement.is_published ? (
                              <>
                                <EyeOff aria-hidden /> Unpublish
                              </>
                            ) : (
                              <>
                                <Eye aria-hidden /> Publish
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              flags.mutate({
                                id: announcement.id,
                                next: { is_pinned: !announcement.is_pinned },
                              })
                            }
                          >
                            {announcement.is_pinned ? (
                              <>
                                <PinOff aria-hidden /> Unpin
                              </>
                            ) : (
                              <>
                                <Pin aria-hidden /> Pin to top
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive onSelect={() => setPendingDelete(announcement)}>
                            <Trash2 aria-hidden /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
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
        label="announcements"
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this announcement?"
        destructive
        confirmLabel="Delete announcement"
        loading={remove.isPending}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
        description={
          <span>
            <strong>{pendingDelete?.title}</strong> will be removed for everyone. To take it down
            temporarily, unpublish it instead.
          </span>
        }
      />
    </div>
  );
}
