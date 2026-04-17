"use client";
import { useState } from "react";
import api from "@/lib/axios";
import { setUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-indigo-600">SHARE</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-lg py-3 font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-500 text-sm">Don't have an account?</p>
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