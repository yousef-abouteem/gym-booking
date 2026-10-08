import { useEffect, useState } from "react";

type Gym = {
  id: string;
  name: string;
  slug: string;
  city: string;
  description: string | null;
};

export default function App() {
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
  if (error) return <p>Error: {error}</p>;

  return (
       <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Gyms</h1>
      <ul className="grid gap-4 sm:grid-cols-2">
        {gyms.map((gym) => (
          <li key={gym.id} className="rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-lg font-semibold">{gym.name}</h2>
            <p className="text-sm text-gray-500">{gym.city}</p>
            {gym.description && <p className="mt-2 text-gray-700">{gym.description}</p>}
          </li>
        ))}
      </ul>
    </main>
  );
}