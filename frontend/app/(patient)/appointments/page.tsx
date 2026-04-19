"use client";
import { useEffect, useRef, useState } from "react";
import api from "@/lib/axios";
import { getUser, logout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Video, LogOut, ChevronLeft, Plus, Trash2 } from "lucide-react";
import ThemeToggle from "@/components/theme/theme-toggle";

const statusColors: any = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  COMPLETED: "bg-gray-100 text-gray-700",
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const deleteDebounceRef = useRef<Record<string, number>>({});
  const [cancelForId, setCancelForId] = useState<string | null>(null);
  const [cancelChoice, setCancelChoice] = useState<string>("");
  const [cancelOther, setCancelOther] = useState<string>("");

  const patientCancelOptions = [
    "I’m not feeling well",
    "I have a schedule conflict",
    "I found another doctor",
    "Issue resolved / no longer needed",
    "Transportation issue",
    "Other reason",
  ];

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await api.get("/appointments/mine");
      setAppointments(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const cancel = async (id: string) => {
    try {
      const reason =
        cancelChoice === "Other reason" ? cancelOther.trim() : cancelChoice.trim();
      if (!reason) {
        alert("Please select a reason");
        return;
      }
      await api.put(`/appointments/${id}/cancel`, { reason });
      setCancelForId(null);
      setCancelChoice("");
      setCancelOther("");
      fetchAppointments();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to cancel");
    }
  };

  const isAppointmentFinished = (appt: any) => {
    const start = new Date(appt.scheduled_at).getTime();
    const durationMins = Number(appt.duration_minutes ?? 30);
    const end = start + durationMins * 60_000;
    return Date.now() >= end;
  };

  const deleteAppointment = async (id: string) => {
    const now = Date.now();
    const last = deleteDebounceRef.current[id] ?? 0;
    if (now - last < 900) return;
    deleteDebounceRef.current[id] = now;

    if (!confirm("Delete this finished appointment from your list?")) return;
    try {
      await api.delete(`/appointments/${id}`);
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete appointment");
    }
  };

  const canCancel = (appt: any) => {
    if (appt.status === "CANCELLED" || appt.status === "COMPLETED") return false;
    return !isAppointmentFinished(appt);
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-indigo-600">
            <ChevronLeft size={20} /> Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle size="sm" />
            <button onClick={logout} className="flex items-center gap-1 text-red-500 text-sm">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-gray-800">My Appointments</h2>
          <button
            type="button"
            onClick={() => router.push("/search")}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-600"
          >
            <Plus size={16} />
            New Appointment
          </button>
        </div>
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-20">
            <Calendar size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">No appointments yet.</p>
            <Link href="/search" className="text-indigo-600 hover:underline mt-2 inline-block">
              Book your first appointment
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appt: any) => (
              <div key={appt.id} className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[appt.status]}`}>
                        {appt.status}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        appt.consultation_type === "VIDEO"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-orange-100 text-orange-600"
                      }`}>
                        {appt.consultation_type === "VIDEO" ? "🎥 Video" : "🏥 In Person"}
                      </span>
                    </div>
                    <p className="text-gray-800 font-medium">
                      {new Date(appt.scheduled_at).toLocaleString("en-IN", {
                        dateStyle: "full", timeStyle: "short"
                      })}
                    </p>
                    {appt.notes && (
                      <p className="text-gray-500 text-sm mt-1">Notes: {appt.notes}</p>
                    )}
                    {appt.meeting_link && (
                      <a href={appt.meeting_link} target="_blank" rel="noreferrer"
                        className="text-blue-600 hover:underline text-sm mt-2 flex items-center gap-1">
                        <Video size={14} /> Join Meeting
                      </a>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="text-green-600 font-semibold">₹{appt.payment_amount}</p>
                    <span className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${
                      appt.payment_status === "PAID"
                        ? "bg-green-100 text-green-600"
                        : "bg-yellow-100 text-yellow-600"
                    }`}>
                      {appt.payment_status}
                    </span>

                    {isAppointmentFinished(appt) && (
                      <button
                        type="button"
                        onClick={() => void deleteAppointment(appt.id)}
                        className="mt-1 inline-flex items-center justify-center rounded-full p-2 text-red-600 hover:bg-red-50"
                        aria-label="Delete appointment"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
                {canCancel(appt) && (
                  <button
                    onClick={() => { setCancelForId(appt.id); setCancelChoice(""); setCancelOther(""); }}
                    className="mt-4 text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Cancel Appointment
                  </button>
                )}

                {cancelForId === appt.id && (
                  <div className="mt-4 rounded-2xl border bg-white p-4">
                    <p className="text-sm font-semibold text-gray-800 mb-3">Why are you cancelling?</p>
                    <div className="space-y-2">
                      {patientCancelOptions.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="radio"
                            name={`cancel-reason-${appt.id}`}
                            value={opt}
                            checked={cancelChoice === opt}
                            onChange={() => setCancelChoice(opt)}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                    {cancelChoice === "Other reason" && (
                      <textarea
                        value={cancelOther}
                        onChange={(e) => setCancelOther(e.target.value)}
                        rows={2}
                        placeholder="Type your reason..."
                        className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
                      />
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void cancel(appt.id)}
                        className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                      >
                        Confirm Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setCancelForId(null)}
                        className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}