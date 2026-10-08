import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

type Gym = {
  id: string;
  name: string;
  slug: string;
  city: string;
  description: string | null;
};

type Session = {
  id: string;
  class_name: string;
  trainer_name: string | null;
  start_time: string;
  end_time: string;
  capacity: number;
  spots_left: number;
};

// تنسيق التاريخ والوقت حسب لغة المتصفح وتوقيته
const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function SpotsBadge({ spots }: { spots: number }) {
  if (spots <= 0) {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
        Full
      </span>
    );
  }
  const low = spots <= 3;
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium ${
        low ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"
      }`}
    >
      {spots} {spots === 1 ? "spot" : "spots"} left
    </span>
  );
}

export default function GymPage() {
  const { slug } = useParams();
  const [gym, setGym] = useState<Gym | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // الطلبان يُرسلان معًا بدل انتظار الأول ثم الثاني
        const [gymRes, sessionsRes] = await Promise.all([
          fetch(`/api/gyms/${slug}`),
          fetch(`/api/gyms/${slug}/sessions`),
        ]);
        if (gymRes.status === 404) throw new Error("Gym not found");
        if (!gymRes.ok || !sessionsRes.ok) throw new Error("Failed to load gym");

        setGym((await gymRes.json()).gym);
        setSessions((await sessionsRes.json()).sessions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) return <p>Loading...</p>;
  if (error || !gym) return <p className="text-red-600">{error ?? "Gym not found"}</p>;

  return (
    <div>
      <Link to="/" className="text-sm text-blue-600 hover:underline">
        ← All gyms
      </Link>

      <h1 className="mt-4 text-3xl font-bold">{gym.name}</h1>
      <p className="text-gray-500">{gym.city}</p>
      {gym.description && <p className="mt-2 text-gray-700">{gym.description}</p>}

      <h2 className="mb-4 mt-8 text-xl font-semibold">Upcoming classes</h2>

      {sessions.length === 0 ? (
        <p className="text-gray-500">No upcoming classes.</p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => {
            const start = new Date(s.start_time);
            const end = new Date(s.end_time);
            return (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-semibold">{s.class_name}</p>
                  <p className="text-sm text-gray-500">
                    {dateFmt.format(start)} · {timeFmt.format(start)} – {timeFmt.format(end)}
                    {s.trainer_name && ` · ${s.trainer_name}`}
                  </p>
                </div>
                <SpotsBadge spots={s.spots_left} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}