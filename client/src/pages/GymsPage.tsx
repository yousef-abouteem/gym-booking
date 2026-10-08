import { useEffect, useState } from "react";
import { Link } from "react-router";

type Gym = {
  id: string;
  name: string;
  slug: string;
  city: string;
  description: string | null;
};

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

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Gyms</h1>
      <ul className="grid gap-4 sm:grid-cols-2">
        {gyms.map((gym) => (
          <li key={gym.id}>
            <Link
              to={`/gyms/${gym.slug}`}
              className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-400 hover:shadow-md"
            >
              <h2 className="text-lg font-semibold">{gym.name}</h2>
              <p className="text-sm text-gray-500">{gym.city}</p>
              {gym.description && <p className="mt-2 text-gray-700">{gym.description}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}