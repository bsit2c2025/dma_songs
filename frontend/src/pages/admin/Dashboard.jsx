import { useEffect, useState } from "react";
import { getDashboardSummary } from "../../api/dashboard";
import PageHeader from "../../components/layout/PageHeader";
import Spinner from "../../components/common/Spinner";
import ErrorMessage from "../../components/common/ErrorMessage";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    getDashboardSummary()
      .then((data) => mounted && setSummary(data))
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <Spinner label="Loading dashboard..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!summary) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Admin" title="Overview" description="Quick snapshot of songs, users, and the current announcement." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total songs" value={summary.total_songs} />
        <StatCard label="Published" value={summary.published_songs} />
        <StatCard label="Unpublished" value={summary.unpublished_songs} />
        <StatCard label="Total users" value={summary.total_users} />
      </div>

      <div className="rounded-lg border border-primary/10 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Voice part distribution
        </h2>
        <div className="flex flex-col gap-2">
          {summary.voice_distribution.map((vp) => (
            <div key={vp.id} className="flex items-center justify-between text-sm">
              <span className="text-primary">{vp.name}</span>
              <span className="font-medium text-muted">{vp.user_count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-primary/10 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Current announcement
        </h2>
        {summary.current_announcement ? (
          <div className="text-sm text-primary">
            <p className="font-semibold">{summary.current_announcement.title}</p>
            <p className="text-muted">
              {summary.current_announcement.event_date} at {summary.current_announcement.event_time} —{" "}
              {summary.current_announcement.venue}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">No announcement is currently published.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-primary/10 bg-white p-4">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
