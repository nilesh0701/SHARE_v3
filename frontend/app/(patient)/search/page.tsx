"use client";
import { useState, useEffect, Suspense } from "react";
import api from "@/lib/axios";
import { getUser, logout } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, MapPin, Video, Building2, User, LogOut, ChevronLeft, SlidersHorizontal } from "lucide-react";
import ThemeToggle from "@/components/theme/theme-toggle";

function SearchPageInner() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    specialty: "",
    consultation_type: "",
    gender: "",
  });
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const u = getUser();
    if (!u) router.push("/login");
  }, [router]);

  // Auto-apply specialty from URL query param
  useEffect(() => {
    const sp = searchParams.get("specialty") || "";
    setFilters(f => ({ ...f, specialty: sp }));
    fetchDoctors(sp, "", "");
  }, [searchParams]);

  const fetchDoctors = async (specialty: string, consultation_type: string, gender: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (specialty) params.append("specialty", specialty);
      if (consultation_type) params.append("consultation_type", consultation_type);
      if (gender) params.append("gender", gender);
      const res = await api.get(`/doctors?${params.toString()}`);
      setDoctors(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchDoctors(filters.specialty, filters.consultation_type, filters.gender);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--app-bg)", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        * { box-sizing: border-box; }
        .doctor-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .doctor-card:hover { transform: translateY(-4px); box-shadow: 0 10px 26px rgba(59,111,232,0.18) !important; }
        input:focus, select:focus { outline: none; border-color: #3B6FE8 !important; }
      `}</style>

      {/* Nav */}
      <nav className="sticky top-0 z-20" style={{ background: "var(--app-surface)", borderBottom: "1px solid var(--app-border)" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard"
            className="flex items-center gap-2 font-semibold transition hover:opacity-70"
            style={{ color: "#3B6FE8", fontSize: 15, textDecoration: "none" }}>
            <ChevronLeft size={20} /> Back to Dashboard
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ThemeToggle size="sm" />
            <button
              onClick={logout}
              className="flex items-center gap-1.5 font-semibold px-4 py-2 rounded-full"
              style={{ background: "var(--app-danger-surface)", color: "var(--app-danger)", fontSize: 14 }}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Heading */}
        <div>
          <h1 className="font-black" style={{ color: "var(--app-fg)", fontSize: 26 }}>
            {filters.specialty ? `${filters.specialty} Doctors` : "Find a Doctor"}
          </h1>
          <p style={{ color: "var(--app-muted)", fontSize: 15, marginTop: 4 }}>
            {doctors.length > 0
              ? `${doctors.length} verified doctor${doctors.length > 1 ? "s" : ""} found`
              : loading ? "Searching…" : "No results yet"}
          </p>
        </div>

        {/* Filters */}
        <div
          className="rounded-3xl p-5 shadow-sm flex flex-wrap gap-3 items-end"
          style={{ background: "var(--app-surface)", border: "1.5px solid var(--app-border)" }}
        >
          {/* Specialty */}
          <div className="flex-1 min-w-[160px]">
            <label className="block font-semibold mb-1.5" style={{ color: "var(--app-muted)", fontSize: 13 }}>Specialty</label>
            <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ border: "2px solid var(--app-border)" }}>
              <Search size={15} style={{ color: "#9CA3AF" }} />
              <input
                type="text"
                placeholder="e.g. Physician"
                value={filters.specialty}
                onChange={e => setFilters({ ...filters, specialty: e.target.value })}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent"
                style={{ border: "none", color: "var(--app-fg)", fontSize: 14 }}
              />
            </div>
          </div>

          {/* Type */}
          <div className="min-w-[150px]">
            <label className="block font-semibold mb-1.5" style={{ color: "var(--app-muted)", fontSize: 13 }}>Type</label>
            <select
              value={filters.consultation_type}
              onChange={e => setFilters({ ...filters, consultation_type: e.target.value })}
              className="w-full rounded-2xl px-4 py-2.5"
              style={{ border: "2px solid var(--app-border)", background: "var(--app-surface)", color: "var(--app-fg)", fontSize: 14 }}>
              <option value="">All Types</option>
              <option value="VIDEO">Video</option>
              <option value="IN_PERSON">In Person</option>
            </select>
          </div>

          {/* Gender */}
          <div className="min-w-[140px]">
            <label className="block font-semibold mb-1.5" style={{ color: "var(--app-muted)", fontSize: 13 }}>Gender</label>
            <select
              value={filters.gender}
              onChange={e => setFilters({ ...filters, gender: e.target.value })}
              className="w-full rounded-2xl px-4 py-2.5"
              style={{ border: "2px solid var(--app-border)", background: "var(--app-surface)", color: "var(--app-fg)", fontSize: 14 }}>
              <option value="">All</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>

          {/* Search btn */}
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-2xl transition"
            style={{ background: "#3B6FE8", fontSize: 15, boxShadow: "0 4px 12px rgba(59,111,232,0.3)" }}>
            <SlidersHorizontal size={16} /> Apply
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            <p style={{ color: "#3B6FE8", fontSize: 15 }}>Searching doctors…</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="font-bold" style={{ color: "var(--app-fg)", fontSize: 18 }}>No doctors found</p>
            <p style={{ color: "var(--app-muted)", fontSize: 15, marginTop: 6 }}>Try different filters or specialty name</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {doctors.map((doc: any) => (
              <Link href={`/doctor/${doc.user_id}`} key={doc.user_id}
                className="doctor-card rounded-3xl p-6 shadow-sm flex gap-4"
                style={{ background: "var(--app-surface)", border: "1.5px solid var(--app-border)", textDecoration: "none" }}>

                {/* Avatar */}
                <div className="flex items-center justify-center rounded-2xl flex-shrink-0 font-black text-white"
                  style={{ width: 58, height: 58, background: "linear-gradient(135deg,#3B6FE8,#6B99FF)", fontSize: 22 }}>
                  {doc.full_name?.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate" style={{ color: "var(--app-fg)", fontSize: 17 }}>
                    Dr. {doc.full_name}
                  </p>
                  <p className="font-semibold" style={{ color: "#3B6FE8", fontSize: 14, marginTop: 1 }}>
                    {doc.specialty}
                  </p>
                  {doc.bio && (
                    <p className="line-clamp-2 mt-1" style={{ color: "var(--app-muted)", fontSize: 13 }}>
                      {doc.bio}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className="font-bold" style={{ color: "#16A34A", fontSize: 16 }}>
                      ₹{doc.consultation_fee}
                    </span>
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: "var(--app-surface-2)", color: "#3B6FE8", border: "1px solid var(--app-border)" }}>
                      {doc.consultation_type === "VIDEO"
                        ? <><Video size={11} /> Video</>
                        : doc.consultation_type === "IN_PERSON"
                        ? <><Building2 size={11} /> In-Person</>
                        : <><Video size={11} /> Video & In-Person</>}
                    </span>
                    {doc.gender && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{ background: "var(--app-surface-2)", color: "var(--app-muted)" }}>
                        {doc.gender}
                      </span>
                    )}
                  </div>
                  {doc.clinic_address && (
                    <div className="flex items-center gap-1 mt-2" style={{ color: "var(--app-muted)" }}>
                      <MapPin size={12} />
                      <span style={{ fontSize: 12 }}>{doc.clinic_address}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  );
}