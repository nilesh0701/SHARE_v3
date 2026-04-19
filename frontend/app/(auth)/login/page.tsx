"use client";
import { useState } from "react";
import api from "@/lib/axios";
import { setUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { ShareMark } from "@/components/branding/share-brand";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("email", email);
      form.append("password", password);
      const res = await api.post("/auth/login", form);
      const token = res.data.data.access_token;
      const decoded: any = jwtDecode(token);
      setUser({ user_id: decoded.sub, email: decoded.email, role: decoded.role }, token);
      if (decoded.role === "PATIENT") router.push("/dashboard");
      else if (decoded.role === "DOCTOR") router.push("/doctor-dashboard");
      else if (decoded.role === "ADMIN") router.push("/admin-dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-16 h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl" />
        <div className="absolute bottom-6 right-0 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />
      </div>

      <div className="relative bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/60 p-8 w-full max-w-md">
        <div className="text-center mb-7 flex flex-col items-center gap-2">
          <ShareMark size={72} priority className="drop-shadow-sm" />
          <h1 className="text-3xl font-black tracking-tight text-teal-700 m-0">SHARE</h1>
          <p className="text-gray-500 text-sm font-medium m-0">SHARE — Healthcare Platform</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/90"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-xl pl-10 pr-11 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/90"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-xl py-3 font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-md hover:shadow-indigo-200"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-500 text-sm">Don&apos;t have an account?</p>
          <div className="flex gap-3 justify-center">
            <Link href="/register?role=patient"
              className="text-indigo-600 font-medium hover:underline text-sm">
              Register as Patient
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/register?role=doctor"
              className="text-indigo-600 font-medium hover:underline text-sm">
              Register as Doctor
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}