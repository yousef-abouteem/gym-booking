import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import AuthCard from "../components/AuthCard";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import { errorBox, inputClass, labelClass, primaryButton } from "../lib/ui";

type Role = "member" | "gym_owner";

const roles: { value: Role; title: string; text: string }[] = [
  { value: "member", title: "I want to train", text: "Book classes at gyms" },
  { value: "gym_owner", title: "I own a gym", text: "List classes and manage bookings" },
];

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });
      // بعد إنشاء الحساب نسجّل الدخول مباشرة حتى لا يكتب المستخدم بياناته مرتين
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join GymBook in less than a minute"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <fieldset>
          <legend className={labelClass}>I'm joining as</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {roles.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                aria-pressed={role === r.value}
                className={`rounded-xl border-2 p-3 text-left transition ${
                  role === r.value
                    ? "border-brand-500 bg-brand-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="text-sm font-semibold">{r.title}</p>
                <p className="mt-0.5 text-xs text-gray-500">{r.text}</p>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className={labelClass}>Full name</span>
          <input
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Yousef Abouteem"
            className={inputClass}
          />
        </label>

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
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className={inputClass}
          />
        </label>

        {error && <p className={errorBox}>{error}</p>}

        <button type="submit" disabled={submitting} className={primaryButton}>
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}