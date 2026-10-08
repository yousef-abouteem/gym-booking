import { Link, Route, Routes } from "react-router";
import { useAuth } from "./context/AuthContext";
import GymsPage from "./pages/GymsPage";
import GymPage from "./pages/GymPage";
import LoginPage from "./pages/LoginPage";
import MyBookingsPage from "./pages/MyBookingsPage";

export default function App() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <nav className="mx-auto flex max-w-3xl items-center justify-between p-4">
          <Link to="/" className="text-xl font-bold">
            GymBook
          </Link>

          <div className="flex items-center gap-4 text-sm">
            {user ? (
              <>
              {user.role === "member" && (
              <Link to="/my-bookings" className="text-gray-600 hover:text-gray-900">
                My bookings
              </Link>
               )}
                <span className="text-gray-600">Hi, {user.name}</span>
                <button
                  onClick={logout}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-100"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link to="/login" className="rounded-lg bg-gray-900 px-3 py-1.5 text-white hover:bg-gray-700">
                Log in
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl p-6">
        <Routes>
          <Route path="/" element={<GymsPage />} />
          <Route path="/gyms/:slug" element={<GymPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<p>Page not found</p>} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
        </Routes>
      </main>
    </div>
  );
}