import { Megaphone } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { AnnouncementCard } from "@/components/common/AnnouncementCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveAnnouncements } from "@/hooks/useAnnouncements";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Announcements() {
  useDocumentTitle("Announcements", "Rehearsal calls, schedule changes and news from DLL Music and Arts.");
  const { data, isLoading, isError, error, refetch } = useLiveAnnouncements();

  return (
    <div>
      <PageHeader
        eyebrow="Noticeboard"
        title="Announcements"
        description="Rehearsal calls, schedule changes and news from the ensemble."
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : isError ? (
        <ErrorState title="Announcements didn't load" error={error} onRetry={refetch} />
      ) : data?.length ? (
        <div className="grid gap-5 md:grid-cols-2">
          {data.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Megaphone />}
          title="No announcements at this time"
          description="When there is news about rehearsals or performances, it will show up here."
        />
      )}
    </div>
  );
}
