import { Link } from "react-router-dom";
import { ArrowRight, Megaphone, Music4 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoicePartPicker } from "@/components/common/VoicePartPicker";
import { AnnouncementCard } from "@/components/common/AnnouncementCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { SongCard, SongCardSkeleton } from "@/components/common/SongCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveAnnouncements } from "@/hooks/useAnnouncements";
import { useSongs } from "@/hooks/useSongs";
import { useVoicePart } from "@/features/voice/VoicePartProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSettings } from "@/hooks/useSettings";
import { settingNumber } from "@/services/settings";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Home() {
  useDocumentTitle(
    undefined,
    "Pick your voice part and start practising. Songs, part videos and announcements for DLL Music and Arts.",
  );

  const { myPart, myPartId } = useVoicePart();
  const { profile, status } = useAuth();
  const { data: settings } = useSettings();
  const announcementLimit = settingNumber(settings, "announcements.home_limit", 3);

  const announcements = useLiveAnnouncements(announcementLimit);
  const songs = useSongs({ voiceClassificationId: myPartId, pageSize: 3, sort: "recent" });

  const greeting = profile?.display_name ? `Welcome back, ${profile.display_name.split(" ")[0]}` : "Welcome";

  return (
    <div className="space-y-12">
      <section aria-labelledby="announcements-heading">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass">{greeting}</p>
        <div className="mb-4 mt-1 flex items-end justify-between gap-4">
          <h1 id="announcements-heading" className="text-2xl sm:text-3xl">
            Announcements
          </h1>
          <Button asChild variant="ghost" size="sm">
            <Link to="/announcements">
              See all <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>

        {announcements.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : announcements.isError ? (
          <ErrorState title="Announcements didn't load" error={announcements.error} onRetry={announcements.refetch} />
        ) : announcements.data?.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {announcements.data.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Megaphone />}
            title="No announcements at this time"
            description="Rehearsal changes and performance calls will appear here."
          />
        )}
      </section>

      {/* The voice part is the first decision a singer makes, so it gets the
          full treatment — but it sits below the announcements, because a
          rehearsal moving to Friday matters more than a preference they have
          probably already set. */}
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
        <h2 className="max-w-3xl text-3xl leading-tight sm:text-4xl">
          Find your line, learn your part.
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Practice recordings, lyrics and rehearsal notes for the DLL Music and Arts ensemble.
          Choose your voice part and the library shows only the music written for it.
        </p>

        <div className="mt-8">
          <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {myPart ? "Your voice part" : "Choose your voice part"}
          </h3>
          <VoicePartPicker />
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/songs">
                {myPart ? `Songs for ${myPart.name}` : "Browse the library"}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            {status === "anonymous" ? (
              <Button asChild variant="outline" size="lg">
                <Link to="/login">Sign in to save your part</Link>
              </Button>
            ) : null}
          </div>
          {!myPart ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No part selected yet — the library will show every song until you pick one.
            </p>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="recent-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 id="recent-heading" className="text-2xl">
            {myPart ? `Recently added for ${myPart.name}` : "Recently added"}
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/songs">
              Open the library <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>

        {songs.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SongCardSkeleton />
            <SongCardSkeleton />
            <SongCardSkeleton />
          </div>
        ) : songs.isError ? (
          <ErrorState title="Songs didn't load" error={songs.error} onRetry={songs.refetch} />
        ) : songs.data?.rows.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {songs.data.rows.map((song) => (
              <SongCard key={song.id} song={song} selectedPartId={myPartId} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Music4 />}
            title={myPart ? `No songs are available for ${myPart.name} yet` : "The library is empty"}
            description="New material is added as it is rehearsed."
            action={
              myPart ? (
                <Button asChild variant="outline">
                  <Link to="/songs">Browse every part</Link>
                </Button>
              ) : undefined
            }
          />
        )}
      </section>
    </div>
  );
}
