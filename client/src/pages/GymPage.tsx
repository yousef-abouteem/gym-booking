import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { ApiError, apiFetch } from "../lib/api";
import { gradientFor } from "../lib/gymStyle";
import PinIcon from "../components/PinIcon";

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

const dayFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

// نجمع الحصص حسب اليوم، مع الحفاظ على ترتيبها الزمني
function groupByDay(sessions: Session[]) {
  const groups = new Map<string, Session[]>();
  for (const s of sessions) {
    const key = new Date(s.start_time).toDateString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  return [...groups.values()];
}

function CapacityBar({ capacity, spotsLeft }: { capacity: number; spotsLeft: number }) {
  const booked = Math.min(capacity, Math.max(0, capacity - spotsLeft));
  const pct = (booked / capacity) * 100;
  const full = spotsLeft <= 0;
  const low = !full && spotsLeft <= 3;

  return (
    <div className="mt-3">
      <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${
            full ? "bg-red-500" : low ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p
        className={`mt-1.5 text-xs font-medium ${
          full ? "text-red-600" : low ? "text-amber-700" : "text-gray-500"
        }`}
      >
        {full ? "Class is full" : `${spotsLeft} of ${capacity} spots left`}
      </p>
    </div>
  );
}

export default function GymPage() {
  const { slug } = useParams();
  const { user } = useAuth();

  const [gym, setGym] = useState<Gym | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const [gymData, sessionsData] = await Promise.all([
          apiFetch<{ gym: Gym }>(`/gyms/${slug}`),
          apiFetch<{ sessions: Session[] }>(`/gyms/${slug}/sessions`),
        ]);
        setGym(gymData.gym);
        setSessions(sessionsData.sessions);

        if (user?.role === "member") {
          const mine = await apiFetch<{ bookings: { session_id: string; status: string }[] }>(
            "/me/bookings"
          );
          setBookedIds(
            new Set(
              mine.bookings.filter((b) => b.status === "confirmed").map((b) => b.session_id)
            )
          );
        } else {
          setBookedIds(new Set());
        }
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
  }, [slug, refreshKey, user]);

  async function handleBook(sessionId: string) {
    setBookingId(sessionId);
    setFeedback(null);
    try {
      await apiFetch(`/sessions/${sessionId}/bookings`, { method: "POST" });
      setFeedback({ sessionId, type: "success", text: "You're in! See you there." });
    } catch (err) {
      setFeedback({
        sessionId,
        type: "error",
        text: err instanceof Error ? err.message : "Booking failed",
      });
    } finally {
      setBookingId(null);
      setRefreshKey((k) => k + 1);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 animate-pulse rounded-3xl bg-gray-200" />
        <div className="h-24 animate-pulse rounded-2xl bg-gray-200" />
        <div className="h-24 animate-pulse rounded-2xl bg-gray-200" />
      </div>
    );
  }

  if (error || !gym) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-semibold">{error ?? "Gym not found"}</p>
        <Link to="/" className="mt-4 inline-block font-medium text-brand-600 hover:underline">
          ← Back to all gyms
        </Link>
      </div>
    );
  }

  const days = groupByDay(sessions);

  return (
    <div>
      <section
        className={`relative mb-10 overflow-hidden rounded-3xl bg-linear-to-br ${gradientFor(gym.id)} p-8 text-white shadow-lg sm:p-10`}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <Link to="/" className="text-sm font-medium text-white/80 transition hover:text-white">
            ← All gyms
          </Link>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">{gym.name}</h1>
          <p className="mt-2 flex items-center gap-1 text-white/90">
            <PinIcon />
            {gym.city}
          </p>
          {gym.description && <p className="mt-4 max-w-xl text-lg text-white/90">{gym.description}</p>}
        </div>
      </section>

      <h2 className="mb-6 text-2xl font-bold tracking-tight">Upcoming classes</h2>

      {days.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          No upcoming classes yet. Check back soon!
        </div>
      ) : (
        <div className="space-y-8">
          {days.map((daySessions) => (
            <section key={daySessions[0].id}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                {dayFmt.format(new Date(daySessions[0].start_time))}
              </h3>

              <ul className="space-y-3">
                {daySessions.map((s) => {
                  const start = new Date(s.start_time);
                  const end = new Date(s.end_time);
                  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
                  const hasSpots = s.spots_left > 0;
                  const isBooked = bookedIds.has(s.id);

                  return (
                    <li
                      key={s.id}
                      className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                        isBooked ? "border-emerald-300 ring-1 ring-emerald-200" : "border-gray-200"
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="w-24 shrink-0">
                          <p className="text-lg font-bold">{timeFmt.format(start)}</p>
                          <p className="text-sm text-gray-500">{minutes} min</p>
                        </div>

                        <div className="flex-1">
                          <p className="text-lg font-semibold">{s.class_name}</p>
                          {s.trainer_name && (
                            <p className="text-sm text-gray-500">with {s.trainer_name}</p>
                          )}
                          <CapacityBar capacity={s.capacity} spotsLeft={s.spots_left} />
                        </div>

                        <div className="shrink-0">
                          {isBooked ? (
                            <Link
                              to="/my-bookings"
                              className="inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                            >
                              Booked ✓
                            </Link>
                          ) : !hasSpots ? (
                            <span className="inline-block cursor-not-allowed rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-400">
                              Full
                            </span>
                          ) : !user ? (
                            <Link
                              to="/login"
                              className="inline-block rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                              Log in to book
                            </Link>
                          ) : user.role === "member" ? (
                            <button
                              onClick={() => handleBook(s.id)}
                              disabled={bookingId !== null}
                              className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-50"
                            >
                              {bookingId === s.id ? "Booking..." : "Book now"}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {feedback?.sessionId === s.id && (
                        <p
                          className={`mt-4 rounded-lg px-3 py-2 text-sm font-medium ${
                            feedback.type === "success"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {feedback.text}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}