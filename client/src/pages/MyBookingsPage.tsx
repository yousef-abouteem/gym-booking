import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

type Booking = {
  id: string;
  status: "confirmed" | "cancelled";
  session_id: string;
  class_name: string;
  gym_name: string;
  gym_slug: string;
  start_time: string;
  end_time: string;
};

const fmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export default function MyBookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<{ bookings: Booking[] }>("/me/bookings")
      .then((data) => setBookings(data.bookings))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load bookings"))
      .finally(() => setLoading(false));
  }, [user, refreshKey]);

  async function handleCancel(id: string) {
    if (!window.confirm("Cancel this booking?")) return;
    setCancellingId(id);
    try {
      await apiFetch(`/bookings/${id}`, { method: "DELETE" });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel booking");
    } finally {
      setCancellingId(null);
    }
  }

  // ننتظر التحقق من التوكن أولًا، وإلا سيُحوَّل المستخدم لصفحة الدخول عند كل تحديث للصفحة
  if (authLoading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (loading) return <p>Loading...</p>;

  const now = new Date();
  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" && new Date(b.start_time) > now
  );
  const history = bookings.filter((b) => !upcoming.includes(b));

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">My bookings</h1>
      {error && <p className="mb-4 text-red-600">{error}</p>}

      <h2 className="mb-3 text-xl font-semibold">Upcoming</h2>
      {upcoming.length === 0 ? (
        <p className="text-gray-500">
          No upcoming bookings.{" "}
          <Link to="/" className="text-blue-600 hover:underline">
            Find a class
          </Link>
        </p>
      ) : (
        <ul className="space-y-3">
          {upcoming.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-semibold">{b.class_name}</p>
                <p className="text-sm text-gray-500">
                  {fmt.format(new Date(b.start_time))} ·{" "}
                  <Link to={`/gyms/${b.gym_slug}`} className="hover:underline">
                    {b.gym_name}
                  </Link>
                </p>
              </div>
              <button
                onClick={() => handleCancel(b.id)}
                disabled={cancellingId !== null}
                className="shrink-0 rounded-lg border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {cancellingId === b.id ? "Cancelling..." : "Cancel"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {history.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-xl font-semibold">Past & cancelled</h2>
          <ul className="space-y-2">
            {history.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white/60 p-4 text-gray-500"
              >
                <div>
                  <p className="font-medium">
                    {b.class_name} · {b.gym_name}
                  </p>
                  <p className="text-sm">{fmt.format(new Date(b.start_time))}</p>
                </div>
                <span className="text-sm">
                  {b.status === "cancelled" ? "Cancelled" : "Completed"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}