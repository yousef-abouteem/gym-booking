import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import AuthCard from "../components/AuthCard";
import { useAuth } from "../context/AuthContext";
import { errorBox, inputClass, labelClass, primaryButton } from "../lib/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  function useDemo() {
    setEmail("yousef@test.com");
    setPassword("password123");
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to book your next class"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-brand-600 hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className={labelClass}>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
          />
        </label>

        {error && <p className={errorBox}>{error}</p>}

        <button type="submit" disabled={submitting} className={primaryButton}>
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm">
        <p className="font-semibold text-gray-700">Just looking around?</p>
        <p className="mt-1 text-gray-500">Try the demo member account.</p>
        <button
          type="button"
          onClick={useDemo}
          className="mt-3 font-semibold text-brand-600 hover:underline"
        >
          Fill in demo credentials →
        </button>
      </div>
    </AuthCard>
  );
}