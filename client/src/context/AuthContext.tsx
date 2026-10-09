import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "../lib/api";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "member" | "gym_owner";
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // نبدأ بحالة التحميل فقط إذا كان هناك توكن محفوظ نحتاج التحقق منه
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem("token")));

  // عند فتح الموقع: إذا وُجد توكن محفوظ، نتحقق منه ونجلب بيانات المستخدم
  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    apiFetch<{ user: User }>("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem("token")) // توكن منتهي أو غير صالح
      .finally(() => setLoading(false));
  }, []);
  
    // مزامنة التبويبات: عند تسجيل الدخول أو الخروج في تبويب آخر، نحدّث هذا التبويب
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== "token") return;
      if (!e.newValue) {
        setUser(null);
        return;
      }
      apiFetch<{ user: User }>("/auth/me")
        .then((data) => setUser(data.user))
        .catch(() => setUser(null));
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  async function login(email: string, password: string) {
    const data = await apiFetch<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("token", data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}