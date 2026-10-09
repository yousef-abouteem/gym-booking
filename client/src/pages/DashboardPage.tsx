import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import { gradientFor, initials } from "../lib/gymStyle";
import { errorBox, inputClass, labelClass, primaryButton } from "../lib/ui";

type OwnedGym = {
  id: string;
  name: string;
  slug: string;
  city: string;
  description: string | null;
  upcoming_sessions: number;
};

// "Power Fit Istanbul" ← "power-fit-istanbul"
function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [gyms, setGyms] = useState<OwnedGym[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role !== "gym_owner") return;
    apiFetch<{ gyms: OwnedGym[] }>("/me/gyms")
      .then((data) => setGyms(data.gyms))
      .catch(() => setGyms([]))
      .finally(() => setLoading(false));
  }, [user, refreshKey]);

  function handleNameChange(value: string) {
    setName(value);
    // الـ slug يتبع الاسم تلقائيًا، إلا إذا عدّله المستخدم بنفسه
    if (!slugTouched) setSlug(slugify(value));
  }

  function resetForm() {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setCity("");
    setDescription("");
    setFormError(null);
    setShowForm(false);
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await apiFetch("/gyms", {
        method: "POST",
        body: JSON.stringify({ name, slug, city, description: description || undefined }),
      });
      resetForm();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create gym");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "gym_owner") return <Navigate to="/" replace />;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
            Owner dashboard
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Your gyms</h1>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
          >
            + New gym
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-10 space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-bold">Create a new gym</h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Gym name</span>
              <input
                required
                minLength={2}
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Power Fit"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Page URL</span>
              <div className="mt-1.5 flex items-center rounded-xl border border-gray-300 transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
                <span className="pl-4 text-sm text-gray-400">/gyms/</span>
                <input
                  required
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  placeholder="power-fit"
                  className="w-full rounded-xl px-1 py-2.5 focus:outline-none"
                />
              </div>
            </label>
          </div>

          <label className="block">
            <span className={labelClass}>City</span>
            <input
              required
              minLength={2}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Istanbul"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>
              Description <span className="font-normal text-gray-400">(optional)</span>
            </span>
            <textarea
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes your gym special?"
              className={inputClass}
            />
          </label>

          {formError && <p className={errorBox}>{formError}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className={primaryButton}>
              {submitting ? "Creating..." : "Create gym"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-200" />
          ))}
        </div>
      ) : gyms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-lg font-semibold">You don't have any gyms yet</p>
          <p className="mt-1 text-gray-500">Create your first gym to start listing classes.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {gyms.map((g) => (
            <li
              key={g.id}
              className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${gradientFor(g.id)} text-lg font-extrabold text-white`}
              >
                {initials(g.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{g.name}</p>
                <p className="text-sm text-gray-500">
                  {g.city} · {g.upcoming_sessions} upcoming{" "}
                  {g.upcoming_sessions === 1 ? "class" : "classes"}
                </p>
              </div>
              <Link
                to={`/gyms/${g.slug}`}
                className="hidden text-sm font-medium text-gray-500 transition hover:text-gray-900 sm:inline"
              >
                View page
              </Link>
              <Link
                to={`/dashboard/gyms/${g.slug}`}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold transition hover:bg-gray-50"
              >
                Manage
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}