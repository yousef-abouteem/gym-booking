import { Link, Route, Routes } from "react-router";
import { useAuth } from "./context/AuthContext";
import GymsPage from "./pages/GymsPage";
import GymPage from "./pages/GymPage";
import LoginPage from "./pages/LoginPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ManageGymPage from "./pages/ManageGymPage";

export default function App() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 antialiased">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
              G
            </span>
            GymBook
          </Link>

          <div className="flex items-center gap-5 text-sm font-medium">
            {user ? (
              <>
                {user.role === "member" && (
                  <Link to="/my-bookings" className="text-gray-600 transition hover:text-gray-900">
                    My bookings
                  </Link>
                )}
      
                {user.role === "gym_owner" && (
                  <Link to="/dashboard" className="text-gray-600 transition hover:text-gray-900">
                    Dashboard
                  </Link>
                )}


                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                    {user.name[0].toUpperCase()}
                  </span>
                  <span className="hidden text-gray-700 sm:inline">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 transition hover:bg-gray-100"
                >
                  Log out
                </button>
              </>
            ) : (

              <>
                <Link to="/login" className="text-gray-600 transition hover:text-gray-900">
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-brand-500 px-4 py-2 text-white transition hover:bg-brand-600"
                >
                  Sign up
                </Link>
              </>

            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Routes>
          <Route path="/" element={<GymsPage />} />
          <Route path="/gyms/:slug" element={<GymPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
          <Route path="*" element={<p>Page not found</p>} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/gyms/:slug" element={<ManageGymPage />} />
        </Routes>
      </main>
    </div>
  );
}