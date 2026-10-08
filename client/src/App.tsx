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
    <main>
      <h1>Gyms</h1>
      <ul>
        {gyms.map((gym) => (
          <li key={gym.id}>
            <strong>{gym.name}</strong> — {gym.city}
            {gym.description && <p>{gym.description}</p>}
          </li>
        ))}
      </ul>
    </main>
  );
}