"use client";
import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { getUser, logout } from "@/lib/auth";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Clock, LogOut, ChevronLeft, Video, Building2, CheckCircle, CalendarCheck, CreditCard, Banknote } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getNextOccurrence(dayOfWeek: number, startTime: string): string {
  const now = new Date();
  const todayDay = now.getDay();
  let daysUntil = (dayOfWeek - todayDay + 7) % 7;
  if (daysUntil === 0) {
    const [h, m] = startTime.split(":").map(Number);
    const slotTime = new Date(now);
    slotTime.setHours(h, m, 0, 0);
    if (slotTime <= now) daysUntil = 7;
  }
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  const [h, m] = startTime.split(":").map(Number);
  next.setHours(h, m, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(h)}:${pad(m)}`;
}

export default function DoctorProfilePage() {
  const { id } = useParams();
  const [doctor, setDoctor] = useState<any>(null);
  const [availability, setAvailability] = useState<any[]>([]);
  const [booking, setBooking] = useState({
    scheduled_at: "",
    consultation_type: "VIDEO",
    notes: "",
    pay_later: false,
  });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    if (!u) router.push("/login");
    fetchDoctor();
  }, [id]);

  const fetchDoctor = async () => {
    try {
      const [docRes, availRes] = await Promise.all([
        api.get(`/doctors/${id}`),
        api.get(`/doctors/${id}/availability`),
      ]);
      setDoctor(docRes.data.data);
      setAvailability(availRes.data.data);
      const ct = docRes.data.data.consultation_type;
      setBooking(b => ({
        ...b,
        consultation_type: ct === "IN_PERSON" ? "IN_PERSON" : "VIDEO"
      }));
    } catch {
      router.push("/search");
    }
  };

  const handleSlotClick = (slot: any) => {
    const slotKey = `${slot.day_of_week}-${slot.start_time}`;
    setSelectedSlot(slotKey);
    const datetimeLocal = getNextOccurrence(slot.day_of_week, slot.start_time);
    setBooking(b => ({ ...b, scheduled_at: datetimeLocal }));
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/appointments", {
        doctor_id: id,
        scheduled_at: new Date(booking.scheduled_at).toISOString(),
        consultation_type: booking.consultation_type,
        notes: booking.notes,
      });
      if (res.data.data.meeting_link) setMeetingLink(res.data.data.meeting_link);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  if (!doctor) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#EEF4FF" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        <p style={{ color: "#3B6FE8", fontFamily: "'DM Sans', sans-serif" }}>Loading doctor profile…</p>
      </div>
    </div>
  );

  if (success) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#EEF4FF" }}>
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center" style={{ border: "1px solid #C7D9FF" }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "#EEF4FF" }}>
          <CheckCircle size={40} style={{ color: "#3B6FE8" }} />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'DM Sans', sans-serif", color: "#1a1a2e" }}>
          Booking Requested!
        </h2>
        <p className="mb-2" style={{ color: "#6b7280" }}>
          Your appointment with <strong>Dr. {doctor.full_name}</strong> has been sent.
        </p>
        {booking.pay_later && (
          <div className="rounded-2xl px-4 py-3 mb-4 text-sm" style={{ background: "#FFF9EC", border: "1px solid #FFD97D", color: "#92600A" }}>
            💰 You chose <strong>Pay Later</strong>. Please settle the fee at the clinic.
          </div>
        )}
        {meetingLink && (
          <div className="rounded-2xl px-4 py-3 mb-4" style={{ background: "#EEF4FF", border: "1px solid #C7D9FF" }}>
            <p className="text-sm font-semibold mb-1" style={{ color: "#3B6FE8" }}>Video Meeting Link</p>
            <a href={meetingLink} target="_blank" rel="noreferrer"
              className="text-sm break-all underline" style={{ color: "#2563EB" }}>{meetingLink}</a>
          </div>
        )}
        <div className="flex flex-col gap-3 mt-6">
          {!booking.pay_later && (
            <Link href="/payment"
              className="w-full py-3 rounded-2xl font-semibold text-white text-center transition"
              style={{ background: "#3B6FE8" }}>
              Proceed to Payment
            </Link>
          )}
          <Link href="/appointments"
            className="w-full py-3 rounded-2xl font-semibold text-center transition"
            style={{ background: "#EEF4FF", color: "#3B6FE8" }}>
            View My Appointments
          </Link>
        </div>
      </div>
    </div>
  );

  const isInPerson = booking.consultation_type === "IN_PERSON";

  return (
    <div className="min-h-screen" style={{ background: "#EEF4FF", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Import DM Sans */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* Nav */}
      <nav className="bg-white shadow-sm sticky top-0 z-10" style={{ borderBottom: "1px solid #C7D9FF" }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/search" className="flex items-center gap-2 text-sm font-medium transition hover:opacity-70" style={{ color: "#3B6FE8" }}>
            <ChevronLeft size={18} /> Back to Search
          </Link>
          <button onClick={logout} className="flex items-center gap-1 text-sm font-medium transition hover:opacity-70" style={{ color: "#EF4444" }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">

        {/* Doctor Card */}
        <div className="bg-white rounded-3xl p-8 shadow-sm" style={{ border: "1px solid #C7D9FF" }}>
          <div className="flex items-start gap-6">
            {/* Avatar placeholder */}
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl font-bold"
              style={{ background: "linear-gradient(135deg, #3B6FE8 0%, #6B99FF 100%)", color: "white" }}>
              {doctor.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold" style={{ color: "#1a1a2e" }}>Dr. {doctor.full_name}</h1>
              <p className="font-semibold mt-0.5" style={{ color: "#3B6FE8" }}>{doctor.specialty}</p>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: "#6b7280" }}>{doctor.bio}</p>
              <div className="flex flex-wrap gap-2 mt-4 items-center">
                <span className="text-xl font-bold" style={{ color: "#16A34A" }}>₹{doctor.consultation_fee}</span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                  style={{ background: "#EEF4FF", color: "#3B6FE8", border: "1px solid #C7D9FF" }}>
                  {doctor.consultation_type === "VIDEO" ? <><Video size={12} /> Video</> :
                   doctor.consultation_type === "IN_PERSON" ? <><Building2 size={12} /> In-Person</> :
                   <><Video size={12} /> Video &amp; In-Person</>}
                </span>
                {doctor.gender && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: "#F3F4F6", color: "#374151" }}>
                    {doctor.gender}
                  </span>
                )}
              </div>
              {doctor.clinic_address && (
                <div className="flex items-center gap-2 mt-3" style={{ color: "#6b7280" }}>
                  <MapPin size={14} />
                  <span className="text-sm">{doctor.clinic_address}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Available Slots */}
        {availability.length > 0 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm" style={{ border: "1px solid #C7D9FF" }}>
            <h3 className="font-bold text-base mb-4 flex items-center gap-2" style={{ color: "#1a1a2e" }}>
              <Clock size={17} style={{ color: "#3B6FE8" }} /> Available Slots
              <span className="text-xs font-normal ml-1" style={{ color: "#9CA3AF" }}>— click to auto-fill date &amp; time</span>
            </h3>
            <div className="flex flex-wrap gap-3">
              {availability.map((slot: any) => {
                const key = `${slot.day_of_week}-${slot.start_time}`;
                const isSelected = selectedSlot === key;
                return (
                  <button
                    key={slot.id}
                    onClick={() => handleSlotClick(slot)}
                    className="flex flex-col items-center px-4 py-3 rounded-2xl text-sm font-semibold transition-all"
                    style={{
                      background: isSelected ? "#3B6FE8" : "#EEF4FF",
                      color: isSelected ? "white" : "#3B6FE8",
                      border: `2px solid ${isSelected ? "#3B6FE8" : "#C7D9FF"}`,
                      transform: isSelected ? "scale(1.05)" : "scale(1)",
                      boxShadow: isSelected ? "0 4px 14px rgba(59,111,232,0.3)" : "none",
                    }}
                  >
                    <span className="text-xs font-bold uppercase tracking-wide opacity-80">
                      {DAY_SHORT[slot.day_of_week]}
                    </span>
                    <span className="mt-0.5">{slot.start_time} – {slot.end_time}</span>
                    {isSelected && (
                      <span className="text-xs mt-1 opacity-90 flex items-center gap-1">
                        <CalendarCheck size={11} /> selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Booking Form */}
        <div className="bg-white rounded-3xl p-6 shadow-sm" style={{ border: "1px solid #C7D9FF" }}>
          <h3 className="font-bold text-base mb-5" style={{ color: "#1a1a2e" }}>
            Book Appointment
          </h3>
          <form onSubmit={handleBook} className="space-y-4">

            {/* Date & Time */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#374151" }}>
                Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={booking.scheduled_at}
                onChange={(e) => {
                  setBooking({ ...booking, scheduled_at: e.target.value });
                  setSelectedSlot(null);
                }}
                required
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
                style={{
                  border: "2px solid #C7D9FF",
                  background: booking.scheduled_at ? "#EEF4FF" : "white",
                  color: "#1a1a2e",
                }}
              />
            </div>

            {/* Consultation Type */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#374151" }}>
                Consultation Type
              </label>
              <select
                value={booking.consultation_type}
                onChange={(e) => setBooking({ ...booking, consultation_type: e.target.value, pay_later: false })}
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
                style={{ border: "2px solid #C7D9FF", color: "#1a1a2e" }}
              >
                {(doctor.consultation_type === "VIDEO" || doctor.consultation_type === "BOTH") && (
                  <option value="VIDEO">🎥 Video Call</option>
                )}
                {(doctor.consultation_type === "IN_PERSON" || doctor.consultation_type === "BOTH") && (
                  <option value="IN_PERSON">🏥 In-Person Visit</option>
                )}
              </select>
            </div>

            {/* Pay Later — only for IN_PERSON */}
            {isInPerson && (
              <div className="rounded-2xl p-4" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                <p className="text-sm font-semibold mb-3" style={{ color: "#92600A" }}>
                  💳 Payment Option
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setBooking(b => ({ ...b, pay_later: false }))}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition"
                    style={{
                      background: !booking.pay_later ? "#3B6FE8" : "white",
                      color: !booking.pay_later ? "white" : "#6B7280",
                      border: `2px solid ${!booking.pay_later ? "#3B6FE8" : "#D1D5DB"}`,
                    }}
                  >
                    <CreditCard size={15} /> Pay Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setBooking(b => ({ ...b, pay_later: true }))}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition"
                    style={{
                      background: booking.pay_later ? "#D97706" : "white",
                      color: booking.pay_later ? "white" : "#6B7280",
                      border: `2px solid ${booking.pay_later ? "#D97706" : "#D1D5DB"}`,
                    }}
                  >
                    <Banknote size={15} /> Pay at Clinic
                  </button>
                </div>
                {booking.pay_later && (
                  <p className="text-xs mt-2" style={{ color: "#92600A" }}>
                    You'll pay ₹{doctor.consultation_fee} directly at the clinic on the day of visit.
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#374151" }}>
                Notes <span className="font-normal" style={{ color: "#9CA3AF" }}>(optional)</span>
              </label>
              <textarea
                value={booking.notes}
                placeholder="Describe your symptoms or any important information for the doctor…"
                onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
                rows={3}
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition resize-none"
                style={{ border: "2px solid #C7D9FF", color: "#1a1a2e" }}
              />
            </div>

            {error && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #3B6FE8 0%, #6B99FF 100%)", boxShadow: "0 4px 14px rgba(59,111,232,0.35)" }}
            >
              {loading ? "Booking…" : `Book for ₹${doctor.consultation_fee}${booking.pay_later ? " (Pay at Clinic)" : ""}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}