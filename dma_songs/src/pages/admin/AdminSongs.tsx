import * as React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, MoreHorizontal, Music4, Pencil, Plus, SearchX, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Pagination } from "@/components/common/Pagination";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { VoicePartChip } from "@/components/common/VoicePartChip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSongs } from "@/hooks/useSongs";
import { useVoiceClassifications } from "@/hooks/useVoiceClassifications";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { deleteSong, setSongStatus } from "@/services/songs";
import { errorMessage } from "@/lib/errors";
import { ADMIN_PAGE_SIZE, SONG_SORTS, type SongSort } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { Song } from "@/types/models";

const ALL = "__all__";

export default function AdminSongs() {
  useDocumentTitle("Songs");
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = React.useState<"all" | "active" | "disabled">("all");
  const [partId, setPartId] = React.useState<string | null>(null);
  const [sort, setSort] = React.useState<SongSort>("recent");
  const [page, setPage] = React.useState(1);
  const [pendingDelete, setPendingDelete] = React.useState<Song | null>(null);

  const parts = useVoiceClassifications(true);
  const query = useSongs({
    search: debouncedSearch,
    voiceClassificationId: partId,
    status: status === "all" ? null : status,
    sort,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    includeDisabled: true,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "songs"] });
    queryClient.invalidateQueries({ queryKey: ["songs"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  };

  const toggleStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: "active" | "disabled" }) => setSongStatus(id, next),
    onSuccess: (_data, variables) => {
      invalidate();
      toast.success(variables.next === "active" ? "Song enabled" : "Song disabled");
    },
    onError: (error) => toast.error(errorMessage(error, "That change didn't save.")),
  });

  const removeSong = useMutation({
    mutationFn: (id: string) => deleteSong(id),
    onSuccess: () => {
      invalidate();
      setPendingDelete(null);
      toast.success("Song deleted");
    },
    onError: (error) => toast.error(errorMessage(error, "The song couldn't be deleted.")),
  });

  const rows = query.data?.rows ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title="Songs"
        description="Add material, assign the parts it's arranged for, and attach a practice video per part."
        actions={
          <Button asChild>
            <Link to="/admin/songs/new">
              <Plus aria-hidden /> Add song
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SearchInput
          id="admin-song-search"
          label="Search songs by title"
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by title…"
        />
        <Select value={status} onValueChange={(value) => { setStatus(value as typeof status); setPage(1); }}>
          <SelectTrigger aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="disabled">Disabled only</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={partId ?? ALL}
          onValueChange={(value) => { setPartId(value === ALL ? null : value); setPage(1); }}
        >
          <SelectTrigger aria-label="Filter by voice part">
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
        <Select value={sort} onValueChange={(value) => setSort(value as SongSort)}>
          <SelectTrigger aria-label="Sort songs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SONG_SORTS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : query.isError ? (
        <ErrorState title="The song list didn't load" error={query.error} onRetry={query.refetch} />
      ) : rows.length === 0 ? (
        debouncedSearch ? (
          <EmptyState
            icon={<SearchX />}
            title="No songs matched your search"
            description={`Nothing matches "${debouncedSearch}".`}
            action={<Button variant="outline" onClick={() => setSearch("")}>Clear the search</Button>}
          />
        ) : (
          <EmptyState
            icon={<Music4 />}
            title="No songs yet"
            description="Add the first piece and assign the parts it's arranged for."
            action={
              <Button asChild>
                <Link to="/admin/songs/new">
                  <Plus aria-hidden /> Add song
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Song</TableHead>
                  <TableHead className="hidden md:table-cell">Voice parts</TableHead>
                  <TableHead className="hidden lg:table-cell">Videos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Updated</TableHead>
                  <TableHead className="w-12 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((song) => (
                  <TableRow key={song.id}>
                    <TableCell>
                      <Link to={`/admin/songs/${song.id}/edit`} className="font-semibold hover:text-primary">
                        {song.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {[song.composer, song.arranger].filter(Boolean).join(" • ") || "No credits"}
                        {song.category ? ` · ${song.category}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {song.voiceClassifications.slice(0, 3).map((part) => (
                          <VoicePartChip key={part.id} part={part} />
                        ))}
                        {song.voiceClassifications.length > 3 ? (
                          <span className="text-xs text-muted-foreground">
                            +{song.voiceClassifications.length - 3}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Video className="h-4 w-4" aria-hidden /> {song.videos.length}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={song.status === "active" ? "success" : "secondary"}>
                        {song.status === "active" ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground xl:table-cell">
                      {formatDate(song.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${song.title}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/songs/${song.id}/edit`}>
                              <Pencil aria-hidden /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/songs/${song.id}`} target="_blank">
                              <Eye aria-hidden /> Preview
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              toggleStatus.mutate({
                                id: song.id,
                                next: song.status === "active" ? "disabled" : "active",
                              })
                            }
                          >
                            {song.status === "active" ? (
                              <>
                                <EyeOff aria-hidden /> Disable
                              </>
                            ) : (
                              <>
                                <Eye aria-hidden /> Enable
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive onSelect={() => setPendingDelete(song)}>
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
        label="songs"
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this song permanently?"
        destructive
        confirmLabel="Delete song"
        confirmPhrase={pendingDelete?.title}
        loading={removeSong.isPending}
        onConfirm={() => pendingDelete && removeSong.mutate(pendingDelete.id)}
        description={
          <span className="space-y-2 block">
            <span className="block">
              <strong>{pendingDelete?.title}</strong> and its {pendingDelete?.videos.length ?? 0} practice
              video link(s) will be removed for everyone. This can't be undone.
            </span>
            <span className="block text-muted-foreground">
              To take a song out of the library temporarily, disable it instead — the material is kept.
            </span>
          </span>
        }
      />
    </div>
  );
}
