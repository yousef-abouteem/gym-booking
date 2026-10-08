import { Link, Route, Routes } from "react-router";
import GymsPage from "./pages/GymsPage";
import GymPage from "./pages/GymPage";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <nav className="mx-auto flex max-w-3xl items-center justify-between p-4">
          <Link to="/" className="text-xl font-bold">
            GymBook
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl p-6">
        <Routes>
          <Route path="/" element={<GymsPage />} />
          <Route path="/gyms/:slug" element={<GymPage />} />
          <Route path="*" element={<p>Page not found</p>} />
        </Routes>
      </main>
    </div>
  );
}