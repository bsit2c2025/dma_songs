import * as React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Eye, EyeOff, FolderInput, MoreHorizontal, Music4, Pencil, Plus, SearchX, ShieldAlert,
  Trash2, Video,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Pagination } from "@/components/common/Pagination";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { BulkActionBar } from "@/components/common/BulkActionBar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { bulkSongAction, type BulkAction } from "@/services/bulkSongs";
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
import { useSongs, useSongCategories } from "@/hooks/useSongs";
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

  /**
   * Selection is held as a map of id to title rather than a set of ids, so the
   * confirmation dialogs can name what is about to happen even after the rows
   * themselves have been filtered off screen.
   */
  const [selected, setSelected] = React.useState<Record<string, string>>({});
  const [bulkCategory, setBulkCategory] = React.useState("");
  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [bulkPart, setBulkPart] = React.useState<{ id: string; mode: "add_part" | "remove_part" } | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);

  const selectedIds = Object.keys(selected);
  const clearSelection = () => setSelected({});

  const parts = useVoiceClassifications(true);
  const categories = useSongCategories();
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
  const allOnPageSelected = rows.length > 0 && rows.every((song) => selected[song.id]);

  function toggleOne(song: Song, checked: boolean) {
    setSelected((current) => {
      const next = { ...current };
      if (checked) next[song.id] = song.title;
      else delete next[song.id];
      return next;
    });
  }

  function togglePage(checked: boolean) {
    setSelected((current) => {
      const next = { ...current };
      rows.forEach((song) => {
        if (checked) next[song.id] = song.title;
        else delete next[song.id];
      });
      return next;
    });
  }

  const bulk = useMutation({
    mutationFn: ({ action, value }: { action: BulkAction; value?: string | null }) =>
      bulkSongAction(selectedIds, action, value),
    onSuccess: (count, variables) => {
      invalidate();
      clearSelection();
      setCategoryOpen(false);
      setBulkPart(null);
      setBulkDeleteOpen(false);
      const what: Record<BulkAction, string> = {
        set_category: "recategorised",
        enable: "enabled",
        disable: "disabled",
        delete: "deleted",
        add_part: "updated",
        remove_part: "updated",
      };
      toast.success(`${count} song${count === 1 ? "" : "s"} ${what[variables.action]}`);
    },
    onError: (error) => toast.error(errorMessage(error, "That bulk change didn't apply.")),
  });

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

      <BulkActionBar count={selectedIds.length} onClear={clearSelection}>
        <Button size="sm" variant="outline" onClick={() => setCategoryOpen(true)}>
          <FolderInput aria-hidden /> Set category
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => bulk.mutate({ action: "enable" })}
          disabled={bulk.isPending}
        >
          <Eye aria-hidden /> Enable
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => bulk.mutate({ action: "disable" })}
          disabled={bulk.isPending}
        >
          <EyeOff aria-hidden /> Disable
        </Button>
        <Select
          value=""
          onValueChange={(value) => {
            const [mode, id] = value.split(":");
            setBulkPart({ id, mode: mode as "add_part" | "remove_part" });
          }}
        >
          <SelectTrigger className="h-9 w-44" aria-label="Add or remove a voice part">
            <SelectValue placeholder="Voice parts…" />
          </SelectTrigger>
          <SelectContent>
            {(parts.data ?? []).map((part) => (
              <SelectItem key={`add-${part.id}`} value={`add_part:${part.id}`}>
                Add {part.name}
              </SelectItem>
            ))}
            {(parts.data ?? []).map((part) => (
              <SelectItem key={`remove-${part.id}`} value={`remove_part:${part.id}`}>
                Remove {part.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setBulkDeleteOpen(true)}
          disabled={bulk.isPending}
        >
          <Trash2 aria-hidden /> Delete
        </Button>
      </BulkActionBar>

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
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={(value) => togglePage(value === true)}
                      aria-label="Select every song on this page"
                    />
                  </TableHead>
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
                  <TableRow key={song.id} data-state={selected[song.id] ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={Boolean(selected[song.id])}
                        onCheckedChange={(value) => toggleOne(song, value === true)}
                        aria-label={`Select ${song.title}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Link to={`/admin/songs/${song.id}/edit`} className="font-semibold hover:text-primary">
                        {song.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {[song.composer, song.arranger].filter(Boolean).join(" • ") || "No credits"}
                        {song.category ? ` · ${song.category}` : ""}
                      </p>
                      {song.lyrics && !song.rights_confirmed ? (
                        <span className="mt-1 inline-flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[0.7rem] font-semibold text-destructive">
                          <ShieldAlert className="h-3 w-3" aria-hidden /> Rights not confirmed
                        </span>
                      ) : null}
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

      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set the category on {selectedIds.length} song(s)</DialogTitle>
            <DialogDescription>
              This replaces whatever category those songs have now. Leave it empty to clear it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bulk-category">Category</Label>
            <Input
              id="bulk-category"
              list="bulk-category-options"
              value={bulkCategory}
              onChange={(event) => setBulkCategory(event.target.value)}
              placeholder="Liturgical, Patriotic, Contest piece…"
            />
            <datalist id="bulk-category-options">
              {(categories.data ?? []).map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCategoryOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={bulk.isPending}
              onClick={() => bulk.mutate({ action: "set_category", value: bulkCategory })}
            >
              Apply to {selectedIds.length} song(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(bulkPart)}
        onOpenChange={(open) => !open && setBulkPart(null)}
        title={
          bulkPart?.mode === "add_part"
            ? "Add this voice part to the selected songs?"
            : "Remove this voice part from the selected songs?"
        }
        confirmLabel={bulkPart?.mode === "add_part" ? "Add the part" : "Remove the part"}
        destructive={bulkPart?.mode === "remove_part"}
        loading={bulk.isPending}
        onConfirm={() => bulkPart && bulk.mutate({ action: bulkPart.mode, value: bulkPart.id })}
        description={
          <span>
            {bulkPart?.mode === "add_part" ? "Adding" : "Removing"}{" "}
            <strong>{(parts.data ?? []).find((p) => p.id === bulkPart?.id)?.name}</strong> across{" "}
            {selectedIds.length} song(s).
            {bulkPart?.mode === "remove_part" ? (
              <span className="mt-2 block text-muted-foreground">
                Songs where this is the only remaining part are skipped — a song with no parts is
                one nobody can find.
              </span>
            ) : null}
          </span>
        }
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedIds.length} song(s) permanently?`}
        destructive
        confirmLabel={`Delete ${selectedIds.length} song(s)`}
        confirmPhrase={selectedIds.length > 4 ? "DELETE" : undefined}
        loading={bulk.isPending}
        onConfirm={() => bulk.mutate({ action: "delete" })}
        description={
          <span className="block space-y-2">
            <span className="block">
              These songs and their video links go for everyone. This can't be undone.
            </span>
            <span className="block max-h-32 overflow-auto rounded border border-border bg-muted p-2 text-xs">
              {Object.values(selected).join(", ")}
            </span>
            <span className="block text-muted-foreground">
              To take them out of the library temporarily, use Disable instead.
            </span>
          </span>
        }
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
