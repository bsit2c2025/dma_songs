import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Music4, SearchX, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { FreshnessBar } from "@/components/common/FreshnessBar";
import { SongCard, SongCardSkeleton } from "@/components/common/SongCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Pagination } from "@/components/common/Pagination";
import { VoicePartFilter } from "@/components/common/VoicePartFilter";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSongs, useSongCategories } from "@/hooks/useSongs";
import { useVoicePart } from "@/features/voice/VoicePartProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSettings } from "@/hooks/useSettings";
import { settingNumber } from "@/services/settings";
import { SONG_SORTS, type SongSort } from "@/lib/constants";

const ALL = "__all__";

export default function Songs() {
  const { myPart, parts } = useVoicePart();
  const { profile } = useAuth();
  const { data: settings } = useSettings();
  const pageSize = settingNumber(settings, "songs.page_size", 12);
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = React.useState(params.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(search, 300);
  const sort = (params.get("sort") as SongSort) ?? "recent";
  const category = params.get("category");
  // The library filter lives in the URL and defaults to every part, so a
  // shared link shows the same thing to whoever opens it. It is not the same
  // idea as the member's own section.
  const partFilter = params.get("part");
  const filtered = parts.find((part) => part.id === partFilter) ?? null;
  const page = Number(params.get("page") ?? 1);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  useDocumentTitle(
    filtered ? `Songs for ${filtered.name}` : "Song library",
    "Practice material for the DLL Music and Arts ensemble, filtered by voice part.",
  );

  const categories = useSongCategories();
  const query = useSongs({
    search: debouncedSearch,
    voiceClassificationId: partFilter,
    category,
    sort,
    page,
    pageSize,
  });

  const update = React.useCallback(
    (next: Record<string, string | null>) => {
      const merged = new URLSearchParams(params);
      Object.entries(next).forEach(([key, value]) => {
        if (value === null || value === "") merged.delete(key);
        else merged.set(key, value);
      });
      if (!("page" in next)) merged.delete("page");
      setParams(merged, { replace: true });
    },
    [params, setParams],
  );

  React.useEffect(() => {
    if (debouncedSearch !== (params.get("q") ?? "")) update({ q: debouncedSearch || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  /**
   * Apply the member's "open on my own part" preference once, and only when
   * they arrived without a filter in the URL. A shared link always wins, and
   * clearing the filter afterwards must stick rather than snapping back.
   */
  const appliedPreference = React.useRef(false);
  React.useEffect(() => {
    if (appliedPreference.current) return;
    if (!profile?.prefers_own_part || !myPart) return;
    if (params.has("part")) {
      appliedPreference.current = true;
      return;
    }
    appliedPreference.current = true;
    update({ part: myPart.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.prefers_own_part, myPart]);

  // Changing the voice part changes the result set, so go back to page one.
  React.useEffect(() => {
    if (page !== 1) update({ page: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partFilter]);

  const total = query.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Song library"
        title={filtered ? `Songs for ${filtered.name}` : "Every song"}
        description={
          filtered
            ? "Only the music arranged for this part, with its practice video where one exists."
            : "Everything in the library. Narrow it to a single part with the filter below."
        }
      />

      <FreshnessBar className="justify-end" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          id="song-search"
          label="Search songs by title"
          value={search}
          onChange={setSearch}
          placeholder="Search songs by title…"
          className="flex-1"
        />
        <Button
          variant="outline"
          size="default"
          className="sm:hidden"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal aria-hidden /> Filters
        </Button>
        <div className={filtersOpen ? "flex flex-col gap-3 sm:flex-row" : "hidden gap-3 sm:flex"}>
          <VoicePartFilter
            value={partFilter}
            onChange={(value) => update({ part: value })}
            className="w-full sm:w-52"
          />

          <Select
            value={category ?? ALL}
            onValueChange={(value) => update({ category: value === ALL ? null : value })}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {(categories.data ?? []).map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(value) => update({ sort: value })}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Sort songs">
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
      </div>

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SongCardSkeleton key={index} />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState title="The library didn't load" error={query.error} onRetry={query.refetch} />
      ) : query.data?.rows.length ? (
        <>
          <p className="text-sm text-muted-foreground" role="status">
            {total} {total === 1 ? "song" : "songs"}
            {filtered ? ` for ${filtered.name}` : ""}
            {debouncedSearch ? ` matching "${debouncedSearch}"` : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.rows.map((song) => (
              <SongCard key={song.id} song={song} selectedPartId={partFilter ?? myPart?.id ?? null} />
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            label="songs"
            onPageChange={(next) => update({ page: String(next) })}
          />
        </>
      ) : debouncedSearch ? (
        <EmptyState
          icon={<SearchX />}
          title="No songs matched your search"
          description={`Nothing in the library matches "${debouncedSearch}".`}
          action={
            <Button variant="outline" onClick={() => setSearch("")}>
              Clear the search
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={<Music4 />}
          title={
            filtered
              ? `No songs are currently available for ${filtered.name}.`
              : "No songs are available yet."
          }
          description="New material appears here as it is added for rehearsal."
        />
      )}
    </div>
  );
}
