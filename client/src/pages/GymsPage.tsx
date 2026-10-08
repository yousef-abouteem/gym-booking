import { useEffect, useState } from "react";
import { Link } from "react-router";

type Gym = {
  id: string;
  name: string;
  slug: string;
  city: string;
  description: string | null;
};

// كل نادٍ يأخذ تدرجًا لونيًا ثابتًا حسب رقمه
const gradients = [
  "from-orange-500 to-rose-500",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-fuchsia-500",
  "from-amber-500 to-orange-600",
];

function gradientFor(id: string) {
  return gradients[Number(id) % gradients.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function PinIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18s6-5.33 6-10A6 6 0 0 0 4 8c0 4.67 6 10 6 10Zm0-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function GymsPage() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gyms")
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => setGyms(data.gyms))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <section className="relative mb-12 overflow-hidden rounded-3xl bg-gray-900 px-8 py-14 text-white sm:px-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-500">
            Train smarter
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Find your next class
          </h1>
          <p className="mt-4 max-w-xl text-lg text-gray-300">
            Browse gyms in your city, see live availability, and book your spot in seconds.
          </p>
        </div>
      </section>

      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Gyms</h2>
        {!loading && !error && (
          <span className="text-sm text-gray-500">
            {gyms.length} {gyms.length === 1 ? "gym" : "gyms"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-200" />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-xl bg-red-50 p-4 text-red-700">Error: {error}</p>
      ) : gyms.length === 0 ? (
        <p className="text-gray-500">No gyms yet.</p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {gyms.map((gym) => (
            <li key={gym.id}>
              <Link
                to={`/gyms/${gym.slug}`}
               className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={`flex h-32 items-center justify-center bg-linear-to-br ${gradientFor(gym.id)}`}
                >
                  <span className="text-4xl font-extrabold text-white/90 transition group-hover:scale-110">
                    {initials(gym.name)}
                  </span>
                </div>
               <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-lg font-semibold">{gym.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                    <PinIcon />
                    {gym.city}
                  </p>
                  {gym.description && (
                    <p className="mt-3 line-clamp-2 text-sm text-gray-600">{gym.description}</p>
                  )}
                 <p className="mt-auto pt-4 text-sm font-semibold text-brand-600">
                    View classes <span className="inline-block transition group-hover:translate-x-1">→</span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}