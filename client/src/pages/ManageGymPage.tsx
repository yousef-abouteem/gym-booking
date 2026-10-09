import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import { gradientFor } from "../lib/gymStyle";
import { errorBox, inputClass, labelClass, primaryButton } from "../lib/ui";

type OwnedGym = { id: string; name: string; slug: string; city: string };

type ClassType = {
  id: string;
  name: string;
  description: string | null;
  default_capacity: number;
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

type Attendee = { id: string; name: string; email: string; created_at: string };

const sessionFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

// تاريخ اليوم بتوقيت المستخدم بصيغة yyyy-mm-dd، ليكون أقل تاريخ مسموح في حقل التاريخ
function todayLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ManageGymPage() {
  const { slug } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [gym, setGym] = useState<OwnedGym | null>(null);
  const [notOwned, setNotOwned] = useState(false);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // نموذج نوع الحصة
  const [ctName, setCtName] = useState("");
  const [ctDesc, setCtDesc] = useState("");
  const [ctCapacity, setCtCapacity] = useState("15");
  const [ctError, setCtError] = useState<string | null>(null);
  const [ctSubmitting, setCtSubmitting] = useState(false);

  // نموذج جدولة حصة
  const [sTypeId, setSTypeId] = useState("");
  const [sTrainer, setSTrainer] = useState("");
  const [sDate, setSDate] = useState("");
  const [sTime, setSTime] = useState("");
  const [sDuration, setSDuration] = useState("60");
  const [sCapacity, setSCapacity] = useState("");
  const [sError, setSError] = useState<string | null>(null);
  const [sSubmitting, setSSubmitting] = useState(false);

    // قائمة المحجوزين: تُجلب فقط عند فتحها، وتُحفظ حتى لا تُجلب مرتين
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Record<string, Attendee[]>>({});
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== "gym_owner") return;

    async function load() {
      try {
        // نتأكد أن النادي يخص هذا المالك قبل عرض أي شيء
        const { gyms } = await apiFetch<{ gyms: OwnedGym[] }>("/me/gyms");
        const mine = gyms.find((g) => g.slug === slug);
        if (!mine) {
          setNotOwned(true);
          return;
        }
        setGym(mine);

        const [ct, ss] = await Promise.all([
          apiFetch<{ classTypes: ClassType[] }>(`/gyms/${slug}/class-types`),
          apiFetch<{ sessions: Session[] }>(`/gyms/${slug}/sessions`),
        ]);
        setClassTypes(ct.classTypes);
        setSessions(ss.sessions);
        // نختار أول نوع حصة تلقائيًا إذا لم يُختر شيء بعد
        setSTypeId((prev) => prev || ct.classTypes[0]?.id || "");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, slug, refreshKey]);

  async function handleAddType(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCtError(null);
    setCtSubmitting(true);
    try {
      await apiFetch(`/gyms/${slug}/class-types`, {
        method: "POST",
        body: JSON.stringify({
          name: ctName,
          description: ctDesc || undefined,
          default_capacity: Number(ctCapacity),
        }),
      });
      setCtName("");
      setCtDesc("");
      setCtCapacity("15");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setCtError(err instanceof Error ? err.message : "Could not add class type");
    } finally {
      setCtSubmitting(false);
    }
  }

  async function handleSchedule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSError(null);
    setSSubmitting(true);
    try {
      // المتصفح يفهم التاريخ والوقت بتوقيت المستخدم، و toISOString يحوّلهما إلى UTC
      const start = new Date(`${sDate}T${sTime}`);
      const end = new Date(start.getTime() + Number(sDuration) * 60_000);

      await apiFetch(`/gyms/${slug}/sessions`, {
        method: "POST",
        body: JSON.stringify({
          class_type_id: sTypeId,
          trainer_name: sTrainer || undefined,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          capacity: sCapacity ? Number(sCapacity) : undefined,
        }),
      });
      setSTime("");
      setSCapacity("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setSError(err instanceof Error ? err.message : "Could not schedule class");
    } finally {
      setSSubmitting(false);
    }

  }
    async function toggleAttendees(sessionId: string) {
    if (openSessionId === sessionId) {
      setOpenSessionId(null);
      return;
    }
    setOpenSessionId(sessionId);
    if (attendees[sessionId]) return;

    setAttendeesLoading(true);
    try {
      const data = await apiFetch<{ attendees: Attendee[] }>(
        `/gyms/${slug}/sessions/${sessionId}/bookings`
      );
      setAttendees((prev) => ({ ...prev, [sessionId]: data.attendees }));
    } finally {
      setAttendeesLoading(false);
    }
  }

  if (authLoading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "gym_owner") return <Navigate to="/" replace />;

  if (notOwned) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-semibold">This gym isn't in your account</p>
        <Link to="/dashboard" className="mt-4 inline-block font-medium text-brand-600 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  if (loading || !gym) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-3xl bg-gray-200" />
        <div className="h-64 animate-pulse rounded-2xl bg-gray-200" />
      </div>
    );
  }

  const selectedType = classTypes.find((t) => t.id === sTypeId);

  return (
    <div>
      <section
        className={`mb-8 rounded-3xl bg-linear-to-br ${gradientFor(gym.id)} p-8 text-white shadow-lg`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-medium">
          <Link to="/dashboard" className="text-white/80 transition hover:text-white">
            ← Dashboard
          </Link>
          <Link to={`/gyms/${gym.slug}`} className="text-white/80 transition hover:text-white">
            View public page →
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{gym.name}</h1>
        <p className="mt-1 text-white/90">Manage classes and schedule</p>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* أنواع الحصص */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Class types</h2>

          {classTypes.length === 0 ? (
            <p className="text-sm text-gray-500">No class types yet. Add your first one below.</p>
          ) : (
            <ul className="space-y-2">
              {classTypes.map((t) => (
                <li key={t.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm text-gray-500">Default capacity: {t.default_capacity}</p>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={handleAddType}
            className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <h3 className="font-semibold">Add class type</h3>
            <label className="block">
              <span className={labelClass}>Name</span>
              <input
                required
                minLength={2}
                value={ctName}
                onChange={(e) => setCtName(e.target.value)}
                placeholder="Yoga"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>
                Description <span className="font-normal text-gray-400">(optional)</span>
              </span>
              <input
                value={ctDesc}
                onChange={(e) => setCtDesc(e.target.value)}
                placeholder="Relaxing flow for all levels"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Default capacity</span>
              <input
                type="number"
                required
                min={1}
                max={500}
                value={ctCapacity}
                onChange={(e) => setCtCapacity(e.target.value)}
                className={inputClass}
              />
            </label>
            {ctError && <p className={errorBox}>{ctError}</p>}
            <button type="submit" disabled={ctSubmitting} className={primaryButton}>
              {ctSubmitting ? "Adding..." : "Add class type"}
            </button>
          </form>
        </section>

        {/* الجدولة والحصص القادمة */}
        <section className="space-y-6 lg:col-span-2">
          <div>
            <h2 className="mb-4 text-xl font-bold tracking-tight">Schedule a class</h2>

            {classTypes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
                Add a class type first, then you can schedule it here.
              </div>
            ) : (
              <form
                onSubmit={handleSchedule}
                className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2"
              >
                <label className="block">
                  <span className={labelClass}>Class</span>
                  <select
                    value={sTypeId}
                    onChange={(e) => setSTypeId(e.target.value)}
                    className={inputClass}
                  >
                    {classTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className={labelClass}>
                    Trainer <span className="font-normal text-gray-400">(optional)</span>
                  </span>
                  <input
                    value={sTrainer}
                    onChange={(e) => setSTrainer(e.target.value)}
                    placeholder="Coach Ali"
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className={labelClass}>Date</span>
                  <input
                    type="date"
                    required
                    min={todayLocal()}
                    value={sDate}
                    onChange={(e) => setSDate(e.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className={labelClass}>Start time</span>
                  <input
                    type="time"
                    required
                    value={sTime}
                    onChange={(e) => setSTime(e.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className={labelClass}>Duration</span>
                  <select
                    value={sDuration}
                    onChange={(e) => setSDuration(e.target.value)}
                    className={inputClass}
                  >
                    {[30, 45, 60, 75, 90, 120].map((m) => (
                      <option key={m} value={m}>
                        {m} minutes
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className={labelClass}>
                    Capacity <span className="font-normal text-gray-400">(optional)</span>
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={sCapacity}
                    onChange={(e) => setSCapacity(e.target.value)}
                    placeholder={`Default: ${selectedType?.default_capacity ?? ""}`}
                    className={inputClass}
                  />
                </label>

                {sError && <p className={`${errorBox} sm:col-span-2`}>{sError}</p>}

                <div className="sm:col-span-2">
                  <button type="submit" disabled={sSubmitting} className={primaryButton}>
                    {sSubmitting ? "Scheduling..." : "Schedule class"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div>
            <h2 className="mb-4 text-xl font-bold tracking-tight">Upcoming classes</h2>
            {sessions.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing scheduled yet.</p>
            ) : (
                           <ul className="space-y-2">
                {sessions.map((s) => {
                  const booked = Math.max(0, s.capacity - s.spots_left);
                  const isOpen = openSessionId === s.id;
                  const list = attendees[s.id];

                  return (
                    <li key={s.id} className="rounded-xl border border-gray-200 bg-white">
                      <div className="flex items-center justify-between gap-4 p-4">
                        <div>
                          <p className="font-semibold">
                            {s.class_name}
                            {s.trainer_name && (
                              <span className="font-normal text-gray-500"> · {s.trainer_name}</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">
                            {sessionFmt.format(new Date(s.start_time))}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleAttendees(s.id)}
                          className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                        >
                          {booked} / {s.capacity} booked {isOpen ? "▲" : "▼"}
                        </button>
                      </div>

                      {isOpen && (
                        <div className="border-t border-gray-100 px-4 py-3">
                          {!list && attendeesLoading ? (
                            <p className="text-sm text-gray-500">Loading attendees...</p>
                          ) : !list || list.length === 0 ? (
                            <p className="text-sm text-gray-500">No bookings yet.</p>
                          ) : (
                            <ul className="divide-y divide-gray-100">
                              {list.map((a) => (
                                <li key={a.id} className="flex items-center gap-3 py-2">
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                                    {a.name[0].toUpperCase()}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{a.name}</p>
                                    <p className="truncate text-xs text-gray-500">{a.email}</p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}