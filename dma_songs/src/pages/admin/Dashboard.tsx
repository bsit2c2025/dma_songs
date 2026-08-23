import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, Megaphone, Music4, Plus, Users, Video } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardStats } from "@/services/dashboard";
import { listActivity } from "@/services/activity";
import { queryKeys } from "@/lib/queryKeys";
import { ACTIVITY_LABELS } from "@/lib/constants";
import { relativeTime } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-3xl leading-none">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  useDocumentTitle("Dashboard");
  const stats = useQuery({ queryKey: queryKeys.dashboard, queryFn: getDashboardStats });
  const activity = useQuery({
    queryKey: queryKeys.activity({ recent: true }),
    queryFn: () => listActivity({ pageSize: 8 }),
  });

  if (stats.isError) {
    return <ErrorState title="The dashboard didn't load" error={stats.error} onRetry={stats.refetch} />;
  }

  const data = stats.data;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="What's in the library right now, and what changed recently."
        actions={
          <>
            <Button asChild>
              <Link to="/admin/songs/new">
                <Plus aria-hidden /> Add song
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/announcements/new">
                <Megaphone aria-hidden /> New announcement
              </Link>
            </Button>
          </>
        }
      />

      {stats.isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Songs" value={data.songs_total} hint={`${data.songs_active} live in the library`} />
          <Stat label="Disabled songs" value={data.songs_disabled} hint="Hidden from members" />
          <Stat label="Practice videos" value={data.videos_total} />
          <Stat label="Members" value={data.users_total} hint={`${data.admins_total} administrator(s)`} />
          <Stat label="Announcements" value={data.announcements_total} />
          <Stat label="Live announcements" value={data.announcements_live} hint="Published and in date" />
          <Stat label="Voice parts" value={data.voice_breakdown.length} />
          <Stat
            label="Parts with no songs"
            value={data.voice_breakdown.filter((part) => part.song_count === 0).length}
            hint="Worth filling in"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Music4 className="h-5 w-5 text-brass" aria-hidden /> Coverage by voice part
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/voice-classifications">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.isLoading || !data ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              data.voice_breakdown.map((part) => {
                const max = Math.max(1, ...data.voice_breakdown.map((p) => p.song_count));
                return (
                  <div key={part.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium" style={{ color: part.color }}>
                        {part.name}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {part.song_count} songs · {part.member_count} members
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-[width]"
                        style={{
                          width: `${(part.song_count / max) * 100}%`,
                          backgroundColor: part.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-brass" aria-hidden /> Recent activity
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/activity">See all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activity.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : activity.data?.rows.length ? (
              <ul className="divide-y divide-border">
                {activity.data.rows.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium">{ACTIVITY_LABELS[entry.action] ?? entry.action}</span>
                      {entry.resource_label ? (
                        <span className="block truncate text-muted-foreground">{entry.resource_label}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                      {relativeTime(entry.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing has been changed yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brass" aria-hidden /> Quick actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/songs">
              <Music4 aria-hidden /> Manage songs
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/announcements">
              <Megaphone aria-hidden /> Manage announcements
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/users">
              <Users aria-hidden /> Members
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/songs">
              <Video aria-hidden /> View the member library
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
