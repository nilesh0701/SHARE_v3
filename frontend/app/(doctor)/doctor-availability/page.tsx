"use client";
import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { getUser, logout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, LogOut, ChevronLeft } from "lucide-react";
import ThemeToggle from "@/components/theme/theme-toggle";
import { ShareNavWordmark } from "@/components/branding/share-brand";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type AvailabilitySlot = {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
};

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([
    { day_of_week: 1, start_time: "09:00", end_time: "17:00", slot_duration_minutes: 30 }
  ]);
  const [currentSchedule, setCurrentSchedule] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "DOCTOR") { router.push("/login"); return; }
    void fetchExisting();
  }, []);

  const fetchExisting = async () => {
    try {
      const u = getUser();
      const res = await api.get(`/doctors/${u?.user_id}/availability`);
      const existing = (res.data.data ?? []) as AvailabilitySlot[];
      setCurrentSchedule(existing);
      if (existing.length > 0 && slots.length === 1) {
        // Seed the form only if user hasn't started editing
        setSlots(existing);
      }
    } catch {}
  };

  const addSlot = () => {
    setSlots([...slots, { day_of_week: 1, start_time: "09:00", end_time: "17:00", slot_duration_minutes: 30 }]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = <K extends keyof AvailabilitySlot>(
    index: number,
    field: K,
    value: AvailabilitySlot[K]
  ) => {
    const updated = [...slots];
    updated[index] = { ...updated[index], [field]: value };
    setSlots(updated);
  };

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    try {
      await api.post("/doctors/availability", slots);
      setSuccess(true);
      await fetchExisting();
    } catch (err: unknown) {
      const detail =
        typeof err === "object" && err && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      alert(detail || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-[var(--app-fg)]">
      <nav className="shadow-sm border-b" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-5 min-w-0">
            <ShareNavWordmark markSize={36} subtitle="Doctor Portal" />
            <Link href="/doctor-dashboard" className="flex items-center gap-2 text-gray-600 hover:text-teal-700">
              <ChevronLeft size={20} /> Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle size="sm" />
            <button onClick={logout} className="flex items-center gap-1 text-red-500 text-sm">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Set Availability</h2>
        <p className="text-gray-500 mb-6">Define the days and hours you are available for appointments.</p>

        <div className="space-y-4">
          {slots.map((slot, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm border p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-center">
                <select value={slot.day_of_week}
                  onChange={(e) => updateSlot(index, "day_of_week", parseInt(e.target.value))}
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                  {DAYS.map((day, i) => (
                    <option key={i} value={i}>{day}</option>
                  ))}
                </select>
                <input type="time" value={slot.start_time}
                  onChange={(e) => updateSlot(index, "start_time", e.target.value)}
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                <input type="time" value={slot.end_time}
                  onChange={(e) => updateSlot(index, "end_time", e.target.value)}
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                <div className="flex items-center gap-2">
                  <select value={slot.slot_duration_minutes}
                    onChange={(e) => updateSlot(index, "slot_duration_minutes", parseInt(e.target.value))}
                    className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm flex-1">
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                  </select>
                  <button onClick={() => removeSlot(index)}
                    className="text-red-400 hover:text-red-600">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addSlot}
          className="mt-4 flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium">
          <Plus size={18} /> Add Another Day
        </button>

        {success && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
            ✅ Availability saved successfully!
          </div>
        )}

        <button onClick={handleSave} disabled={loading}
          className="mt-6 w-full bg-indigo-600 text-white rounded-lg py-3 font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
          {loading ? "Saving..." : "Save Availability"}
        </button>

        {/* Current Schedule */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-800">Current Schedule</h3>
            <button
              type="button"
              onClick={() => void fetchExisting()}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Refresh
            </button>
          </div>

          {currentSchedule.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border p-5 text-gray-500 text-sm">
              No availability slots saved yet.
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="grid grid-cols-4 gap-2 px-5 py-3 text-xs font-semibold text-gray-500 bg-gray-50 border-b">
                <div>Day</div>
                <div>Start</div>
                <div>End</div>
                <div>Duration</div>
              </div>
              <div className="divide-y">
                {currentSchedule.map((s) => (
                  <div key={s.id ?? `${s.day_of_week}-${s.start_time}-${s.end_time}-${s.slot_duration_minutes}`}
                    className="grid grid-cols-4 gap-2 px-5 py-4 text-sm text-gray-800"
                  >
                    <div className="font-medium">{DAYS[s.day_of_week] ?? `Day ${s.day_of_week}`}</div>
                    <div className="text-gray-700">{s.start_time}</div>
                    <div className="text-gray-700">{s.end_time}</div>
                    <div className="text-gray-700">{s.slot_duration_minutes} min</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}