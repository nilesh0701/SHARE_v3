"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import Link from "next/link";
import { ShareMark } from "@/components/branding/share-brand";

function RegisterForm() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "patient";
  const router = useRouter();

  const [form, setForm] = useState({
    email: "", password: "", full_name: "", phone: "",
    date_of_birth: "", specialty: "", bio: "",
    consultation_fee: "", consultation_type: "VIDEO",
    clinic_address: "", gender: "",
  });
  const [certificate, setCertificate] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      if (role === "patient") {
        formData.append("email", form.email);
        formData.append("password", form.password);
        formData.append("full_name", form.full_name);
        formData.append("phone", form.phone);
        formData.append("date_of_birth", form.date_of_birth);
        await api.post("/auth/register/patient", formData);
        router.push("/login");
      } else {
        formData.append("email", form.email);
        formData.append("password", form.password);
        formData.append("full_name", form.full_name);
        formData.append("specialty", form.specialty);
        formData.append("bio", form.bio);
        formData.append("consultation_fee", form.consultation_fee);
        formData.append("consultation_type", form.consultation_type);
        formData.append("clinic_address", form.clinic_address);
        formData.append("gender", form.gender);
        if (certificate) formData.append("certificate", certificate);
        await api.post("/auth/register/doctor", formData);
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Registration Submitted</h2>
          <p className="text-gray-500 mb-6">Your application is under review. You'll be able to login once an admin approves your account.</p>
          <Link href="/login" className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-10 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
        <div className="text-center mb-6 flex flex-col items-center gap-2">
          <ShareMark size={56} priority />
          <h1 className="text-3xl font-bold tracking-tight text-teal-700 m-0">SHARE</h1>
          <p className="text-gray-500 mt-1 m-0">
            Register as {role === "patient" ? "Patient" : "Doctor"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="full_name" placeholder="Full Name" value={form.full_name}
            onChange={handleChange} required
            className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input name="email" type="email" placeholder="Email" value={form.email}
            onChange={handleChange} required
            className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input name="password" type="password" placeholder="Password" value={form.password}
            onChange={handleChange} required
            className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />

          {role === "patient" && (
            <>
              <input name="phone" placeholder="Phone Number" value={form.phone}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input name="date_of_birth" type="date" placeholder="Date of Birth"
                value={form.date_of_birth} onChange={handleChange}
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </>
          )}

          {role === "doctor" && (
            <>
              <input name="specialty" placeholder="Specialty (e.g. Cardiologist)" value={form.specialty}
                onChange={handleChange} required
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <textarea name="bio" placeholder="Short Bio" value={form.bio}
                onChange={handleChange} required rows={3}
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input name="consultation_fee" type="number" placeholder="Consultation Fee (₹)"
                value={form.consultation_fee} onChange={handleChange} required
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <select name="consultation_type" value={form.consultation_type}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="VIDEO">Video Only</option>
                <option value="IN_PERSON">In Person Only</option>
                <option value="BOTH">Both</option>
              </select>
              <select name="gender" value={form.gender} onChange={handleChange}
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              <input name="clinic_address" placeholder="Clinic Address (if in-person)"
                value={form.clinic_address} onChange={handleChange}
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medical Certificate (PNG only) *
                </label>
                <input type="file" accept=".png,image/png"
                  onChange={(e) => setCertificate(e.target.files?.[0] || null)}
                  required
                  className="w-full border rounded-lg px-4 py-3 focus:outline-none" />
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-lg py-3 font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
            {loading ? "Submitting..." : "Register"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}