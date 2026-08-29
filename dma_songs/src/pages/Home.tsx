import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Megaphone, Music4, Users } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { AnnouncementCard } from "@/components/common/AnnouncementCard";
import { EventCard } from "@/components/common/EventCard";
import { VoicePartPicker } from "@/components/common/VoicePartPicker";
import { EmptyState } from "@/components/common/EmptyState";
import { FreshnessBar } from "@/components/common/FreshnessBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveAnnouncements } from "@/hooks/useAnnouncements";
import { useVoiceClassifications } from "@/hooks/useVoiceClassifications";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/features/auth/AuthProvider";
import { listUpcomingEvents } from "@/services/events";
import { settingNumber, settingString } from "@/services/settings";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Home() {
  useDocumentTitle();
  const { profile, status } = useAuth();
  const { data: settings } = useSettings();
  const parts = useVoiceClassifications();

  const tagline = settingString(settings, "app.tagline", "The choir of Dalubhasaan ng Lungsod ng Lucena");
  const announcementLimit = settingNumber(settings, "announcements.home_limit", 3);
  const announcements = useLiveAnnouncements(announcementLimit);
  const events = useQuery({ queryKey: ["events", "upcoming"], queryFn: () => listUpcomingEvents(4) });

  const isMember = status === "authenticated";
  const isApproved = Boolean(profile?.approved_at);
  // Somebody who has signed in but never answered the welcome questions.
  const needsWelcome = isMember && profile && !profile.onboarded_at && !profile.voice_classification_id;
  const firstName = profile?.display_name?.split(" ")[0];

  // Only events still to come belong on a page meant to make somebody want to
  // join; a list of things they missed does the opposite.
  const upcoming = events.data ?? [];

  return (
    <div className="space-y-14">
      {/* Landing hero. A signed-out visitor cannot reach the music, so this
          page has to do the persuading on its own. */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-card px-6 py-10 sm:px-10 sm:py-14">
        <div className="stave pointer-events-none absolute inset-x-0 top-8 h-[37px] opacity-30" aria-hidden />
        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass">
            {isMember && firstName ? `Welcome back, ${firstName}` : "DLL Music and Arts"}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-[1.05] sm:text-6xl">
            {isMember ? "Find your line, learn your part." : "Sing with us."}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {isMember
              ? tagline
              : "We rehearse, we perform, and we teach each other the music. Every part has its own practice recording, so you can learn your line at home before you ever sing it in a room."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {needsWelcome ? (
              <Button asChild size="lg">
                <Link to="/welcome">
                  Finish setting up <ArrowRight aria-hidden />
                </Link>
              </Button>
            ) : isMember && isApproved ? (
              <Button asChild size="lg">
                <Link to="/songs">
                  <Music4 aria-hidden /> Open the library
                </Link>
              </Button>
            ) : isMember ? (
              <Button asChild size="lg" variant="outline">
                <Link to="/profile">Check your account</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link to="/login">
                    Join the choir <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/login">I'm already a member</Link>
                </Button>
              </>
            )}
          </div>

          {!isMember ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-background p-4">
                <Music4 className="h-5 w-5 text-brass" aria-hidden />
                <p className="mt-2 font-semibold">A recording for every part</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Soprano, alto, tenor, bass — learn your own line at your own pace.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <CalendarDays className="h-5 w-5 text-brass" aria-hidden />
                <p className="mt-2 font-semibold">Know what's next</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rehearsals and concerts with the date, the venue and what to wear.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <Users className="h-5 w-5 text-brass" aria-hidden />
                <p className="mt-2 font-semibold">
                  {parts.data?.length ?? 8} voice parts
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  From Soprano 1 to Bass 2. Not sure where you sit? We'll help you find out.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Events first: a rehearsal moving on Friday matters more than anything
          else on this page. */}
      <section aria-labelledby="events-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 id="events-heading" className="text-2xl">
            What's coming up
          </h2>
        </div>

        {events.isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : upcoming.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Nothing scheduled at the moment. Check back — the season fills up quickly.
            </CardContent>
          </Card>
        )}
      </section>

      <section aria-labelledby="announcements-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 id="announcements-heading" className="text-2xl">
            Announcements
          </h2>
          <FreshnessBar />
          <Button asChild variant="ghost" size="sm">
            <Link to="/announcements">See all</Link>
          </Button>
        </div>

        {announcements.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : announcements.data?.length ? (
          <div className="space-y-4">
            {announcements.data
              .filter((item) => !item.is_event)
              .map((announcement) => (
                <AnnouncementCard key={announcement.id} announcement={announcement} />
              ))}
          </div>
        ) : (
          <EmptyState
            icon={<Megaphone />}
            title="No announcements yet"
            description="News about rehearsals and performances will appear here."
          />
        )}
      </section>

      {isMember && isApproved && !needsWelcome ? (
        <section aria-labelledby="voice-heading">
          <PageHeader
            eyebrow="Your section"
            title="Your voice part"
            description="Your first choice applies straight away. Changing section later needs an administrator's approval."
          />
          <div className="mt-4">
            <VoicePartPicker />
          </div>
        </section>
      ) : null}
    </div>
  );
}
