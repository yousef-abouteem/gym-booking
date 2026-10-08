import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { ApiError, apiFetch } from "../lib/api";

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

type Feedback = {
  sessionId: string;
  type: "success" | "error";
  text: string;
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
  const { user } = useAuth();

  const [gym, setGym] = useState<Gym | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // كل ما زاد هذا الرقم، تُجلب الحصص من جديد
  const [refreshKey, setRefreshKey] = useState(0);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [gymData, sessionsData] = await Promise.all([
          apiFetch<{ gym: Gym }>(`/gyms/${slug}`),
          apiFetch<{ sessions: Session[] }>(`/gyms/${slug}/sessions`),
        ]);
        setGym(gymData.gym);
        setSessions(sessionsData.sessions);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setError("Gym not found");
        } else {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, refreshKey]);

  async function handleBook(sessionId: string) {
    setBookingId(sessionId);
    setFeedback(null);
    try {
      await apiFetch(`/sessions/${sessionId}/bookings`, { method: "POST" });
      setFeedback({ sessionId, type: "success", text: "Booked! See you there." });
    } catch (err) {
      setFeedback({
        sessionId,
        type: "error",
        text: err instanceof Error ? err.message : "Booking failed",
      });
    } finally {
      setBookingId(null);
      // نجلب الأرقام الحقيقية من الخادم، سواء نجح الحجز أو فشل
      setRefreshKey((k) => k + 1);
    }
  }

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
            const hasSpots = s.spots_left > 0;

            return (
              <li key={s.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{s.class_name}</p>
                    <p className="text-sm text-gray-500">
                      {dateFmt.format(start)} · {timeFmt.format(start)} – {timeFmt.format(end)}
                      {s.trainer_name && ` · ${s.trainer_name}`}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <SpotsBadge spots={s.spots_left} />

                    {!user && hasSpots && (
                      <Link to="/login" className="text-sm font-medium text-blue-600 hover:underline">
                        Log in to book
                      </Link>
                    )}

                    {user?.role === "member" && hasSpots && (
                      <button
                        onClick={() => handleBook(s.id)}
                        disabled={bookingId !== null}
                        className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                      >
                        {bookingId === s.id ? "Booking..." : "Book"}
                      </button>
                    )}
                  </div>
                </div>

                {feedback?.sessionId === s.id && (
                  <p
                    className={`mt-3 text-sm ${
                      feedback.type === "success" ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {feedback.text}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}