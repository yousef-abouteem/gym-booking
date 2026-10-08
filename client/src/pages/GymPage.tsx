import { Link, useParams } from "react-router";

export default function GymPage() {
  const { slug } = useParams();

  return (
    <div>
      <Link to="/" className="text-sm text-blue-600 hover:underline">
        ← All gyms
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{slug}</h1>
      <p className="mt-2 text-gray-500">Sessions coming next</p>
    </div>
  );
}