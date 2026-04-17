"use client";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { getStoredToken, getUser, logout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SecurePDFViewer from "@/components/secure-pdf-viewer";
import {
  Calendar, Clock, Video, Building2, LogOut, CheckCircle,
  XCircle, FileText, X, User, CreditCard,
  ChevronRight, Banknote, Eye, BellRing,
} from "lucide-react";

/* ── colour helpers ── */
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING:   { bg: "#FEF9C3", color: "#854D0E" },
  CONFIRMED: { bg: "#DCFCE7", color: "#166534" },
  CANCELLED: { bg: "#FEE2E2", color: "#991B1B" },
  COMPLETED: { bg: "#EEF4FF", color: "#1e40af" },
};

const PAY_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: "#FEF9C3", color: "#854D0E" },
  PAID:    { bg: "#DCFCE7", color: "#166534" },
};

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{
      background: bg, color, borderRadius: 99,
      padding: "3px 12px", fontSize: 12, fontWeight: 700,
      letterSpacing: "0.03em", display: "inline-block",
    }}>
      {label}
    </span>
  );
}

/* ── MODAL ── */
function AppointmentModal({
  appt, onClose,
}: {
  appt: any;
  onClose: () => void;
}) {
  const [detail, setDetail]   = useState<any>(null);
  const [files, setFiles]     = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [openingFile, setOpeningFile]   = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerFileName, setViewerFileName] = useState<string>("Report");
  const [accessExpired, setAccessExpired] = useState(false);

  useEffect(() => {
    /* Fetch patient name + full detail */
    api.get(`/doctor/appointment/${appt.id}/detail`)
      .then(r => setDetail(r.data.data))
      .catch(() => setDetail(null));

    /* Fetch files shared by this patient */
    api.get(`/doctor/shared-files/patient/${appt.patient_id}`)
      .then(r => setFiles(r.data.data))
      .catch(() => setFiles([]))
      .finally(() => setLoadingFiles(false));
  }, [appt.id, appt.patient_id]);

  const openFile = async (permissionId: string, fileName: string) => {
    setErrorMessage(null);
    setAccessExpired(false);
    setViewerUrl(null);
    setOpeningFile(permissionId);
    try {
      await api.get(`/doctor/file/${permissionId}/view`, {
        params: { probe: true },
      });
      const token = getStoredToken();
      if (!token) {
        setErrorMessage("Session expired. Please login again.");
        return;
      }
      const streamBase = `${api.defaults.baseURL}/doctor/file/${permissionId}/view`;
      const streamUrl = `${streamBase}?access_token=${encodeURIComponent(token)}`;
      setViewerFileName(fileName || "Report");
      setViewerUrl(streamUrl);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setAccessExpired(true);
        setErrorMessage("Access Expired. This file permission was revoked or has expired.");
      } else {
        setErrorMessage(err.response?.data?.detail || "File access denied or expired.");
      }
    } finally {
      setOpeningFile(null);
    }
  };

  const st = STATUS_STYLE[appt.status] ?? STATUS_STYLE.PENDING;
  const pt = PAY_STYLE[appt.payment_status] ?? PAY_STYLE.PENDING;

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(10,15,40,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      {/* Modal box */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 28, width: "100%", maxWidth: 540,
          maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 24px 64px rgba(10,15,40,0.22)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "24px 28px 20px",
          borderBottom: "1px solid #EEF4FF",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ color: "#9CA3AF", fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>
              Appointment Details
            </p>
            <h2 style={{ color: "#1a1a2e", fontSize: 20, fontWeight: 900, margin: 0 }}>
              {detail?.patient_name
                ? `Patient: ${detail.patient_name}`
                : "Loading patient info…"}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "#F3F4F6", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={18} color="#6B7280" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
          {errorMessage && (
            <div style={{
              background: "#FEF2F2", border: "1px solid #FECACA",
              color: "#B91C1C", borderRadius: 12, padding: "10px 12px",
              fontSize: 13, fontWeight: 600,
            }}>
              {errorMessage}
            </div>
          )}

          {/* Status row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Badge label={appt.status} {...st} />
            <Badge
              label={appt.consultation_type === "VIDEO" ? "🎥 Video" : "🏥 In-Person"}
              bg="#EEF4FF" color="#3B6FE8"
            />
            <Badge label={`Payment: ${appt.payment_status}`} {...pt} />
          </div>

          {/* Info grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
          }}>
            {[
              { icon: Calendar, label: "Date & Time", value: new Date(appt.scheduled_at).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" }) },
              { icon: User,     label: "Patient Email", value: detail?.patient_email ?? "—" },
              { icon: User,     label: "Phone", value: detail?.patient_phone ?? "—" },
              { icon: User,     label: "Date of Birth", value: detail?.patient_dob ?? "—" },
              { icon: CreditCard, label: "Consultation Fee", value: `₹${appt.payment_amount}` },
              { icon: Banknote,   label: "Payment Status", value: appt.payment_status },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{
                background: "#F9FAFB", borderRadius: 16,
                padding: "14px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Icon size={14} style={{ color: "#3B6FE8" }} />
                  <span style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 600 }}>{label}</span>
                </div>
                <p style={{ color: "#1a1a2e", fontSize: 14, fontWeight: 700, margin: 0, wordBreak: "break-word" }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Notes */}
          {appt.notes && (
            <div style={{ background: "#FFF9EC", borderRadius: 16, padding: "14px 16px", border: "1px solid #FDE68A" }}>
              <p style={{ color: "#92600A", fontSize: 12, fontWeight: 700, margin: "0 0 4px" }}>Patient Notes</p>
              <p style={{ color: "#1a1a2e", fontSize: 14, margin: 0 }}>{appt.notes}</p>
            </div>
          )}

          {/* Meeting link */}
          {appt.meeting_link && (
            <div style={{ background: "#EEF4FF", borderRadius: 16, padding: "14px 16px", border: "1px solid #C7D9FF" }}>
              <p style={{ color: "#3B6FE8", fontSize: 12, fontWeight: 700, margin: "0 0 6px" }}>Video Meeting</p>
              <a
                href={appt.meeting_link} target="_blank" rel="noreferrer"
                style={{
                  background: "#3B6FE8", color: "white", borderRadius: 12,
                  padding: "8px 18px", fontSize: 14, fontWeight: 700,
                  textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <Video size={15} /> Join Meeting
              </a>
            </div>
          )}

          {/* Shared Files */}
          <div>
            <p style={{ color: "#1a1a2e", fontSize: 16, fontWeight: 800, margin: "0 0 12px" }}>
              Shared Medical Files
            </p>
            {loadingFiles ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9CA3AF", fontSize: 14 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  border: "3px solid #C7D9FF", borderTopColor: "#3B6FE8",
                  animation: "spin 0.8s linear infinite",
                }} />
                Loading files…
              </div>
            ) : files.length === 0 ? (
              <div style={{
                background: "#F9FAFB", borderRadius: 16,
                padding: "18px", textAlign: "center", color: "#9CA3AF", fontSize: 14,
              }}>
                <FileText size={28} style={{ margin: "0 auto 6px", opacity: 0.4 }} />
                No files shared by this patient yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {files.map((f: any) => (
                  <div key={f.permission_id} style={{
                    background: "#F9FAFB", borderRadius: 16,
                    padding: "14px 16px",
                    display: "flex", alignItems: "center", gap: 14,
                    border: "1px solid #EEF4FF",
                  }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      background: "#EEF4FF",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <FileText size={20} style={{ color: "#3B6FE8" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "#1a1a2e", fontSize: 14, fontWeight: 700, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.file_name}
                      </p>
                      <p style={{ color: "#9CA3AF", fontSize: 12, margin: 0 }}>
                        {(f.size_bytes / 1024).toFixed(1)} KB · {f.file_type}
                      </p>
                    </div>
                    <button
                      onClick={() => openFile(f.permission_id, f.file_name)}
                      disabled={openingFile === f.permission_id}
                      style={{
                        background: "#3B6FE8", color: "white",
                        border: "none", borderRadius: 12, padding: "8px 16px",
                        fontSize: 13, fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6,
                        opacity: openingFile === f.permission_id ? 0.6 : 1,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      <Eye size={14} />
                      {openingFile === f.permission_id ? "Opening…" : "View"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          {appt.status === "PENDING" && (
            <div style={{ display: "flex", gap: 10 }}>
              <ActionBtn apptId={appt.id} action="confirm" onDone={onClose} />
              <ActionBtn apptId={appt.id} action="cancel"  onDone={onClose} variant="red" />
            </div>
          )}
        </div>
      </div>

      {(viewerUrl || accessExpired) && (
        <div
          onClick={() => {
            setViewerUrl(null);
            setAccessExpired(false);
          }}
          style={{
            position: "fixed", inset: 0, zIndex: 60,
            background: "rgba(10,15,40,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white", borderRadius: 20, width: "100%", maxWidth: 900,
              boxShadow: "0 24px 64px rgba(10,15,40,0.22)", padding: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>
                {accessExpired ? "Access Expired" : viewerFileName}
              </p>
              <button
                onClick={() => {
                  setViewerUrl(null);
                  setAccessExpired(false);
                }}
                style={{
                  width: 34, height: 34, borderRadius: "50%",
                  border: "none", background: "#F3F4F6", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X size={16} color="#6B7280" />
              </button>
            </div>
            {accessExpired ? (
              <div style={{
                background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C",
                borderRadius: 14, padding: "14px 16px", fontSize: 14, fontWeight: 600,
              }}>
                Access expired for this report. Ask the patient to share the file again with an active time window.
              </div>
            ) : (
              <SecurePDFViewer streamUrl={viewerUrl as string} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  apptId, action, onDone, variant = "green",
}: {
  apptId: string; action: "confirm" | "cancel"; onDone: () => void; variant?: "green" | "red";
}) {
  const [loading, setLoading] = useState(false);
  const bg = variant === "green" ? "#16A34A" : "#DC2626";

  const handle = async () => {
    setLoading(true);
    try {
      await api.put(`/appointments/${apptId}/${action}`);
      onDone();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handle} disabled={loading}
      style={{
        flex: 1, background: bg, color: "white", border: "none",
        borderRadius: 16, padding: "12px", fontSize: 15, fontWeight: 700,
        cursor: "pointer", opacity: loading ? 0.6 : 1,
        fontFamily: "'DM Sans', sans-serif",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}
    >
      {action === "confirm"
        ? <><CheckCircle size={17} /> Confirm</>
        : <><XCircle size={17} /> Cancel</>}
    </button>
  );
}

/* ── MAIN DASHBOARD ── */
export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [sharedNotifications, setSharedNotifications] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "DOCTOR") { router.push("/login"); return; }
    void Promise.all([fetchAppointments(), fetchSharedNotifications()]);
  }, [router]);

  const fetchAppointments = async () => {
    try {
      const res = await api.get("/appointments/mine");
      setAppointments(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedNotifications = async () => {
    try {
      const res = await api.get("/doctor/shared-files/notifications");
      setSharedNotifications(res.data.data);
    } catch {
      setSharedNotifications([]);
    }
  };

  const groupedAppts = {
    PENDING:   appointments.filter(a => a.status === "PENDING"),
    CONFIRMED: appointments.filter(a => a.status === "CONFIRMED"),
    COMPLETED: appointments.filter(a => a.status === "COMPLETED"),
    CANCELLED: appointments.filter(a => a.status === "CANCELLED"),
  };

  return (
    <div className="min-h-screen" style={{ background: "#EEF4FF", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .appt-card { transition: transform 0.18s ease, box-shadow 0.18s ease; cursor: pointer; }
        .appt-card:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(59,111,232,0.16) !important; }
      `}</style>

      {/* NAV */}
      <nav className="bg-white sticky top-0 z-20" style={{ borderBottom: "1px solid #C7D9FF" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: "#3B6FE8", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(59,111,232,0.35)" }}>
              <span style={{ color: "white", fontWeight: 900, fontSize: 20 }}>S</span>
            </div>
            <div>
              <p style={{ color: "#1a1a2e", fontWeight: 900, fontSize: 20, margin: 0, letterSpacing: "-0.4px" }}>SHARE</p>
              <p style={{ color: "#3B6FE8", fontWeight: 600, fontSize: 12, margin: 0 }}>Doctor Portal</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/doctor-availability"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "#EEF4FF", color: "#3B6FE8",
                borderRadius: 99, padding: "10px 18px",
                fontWeight: 700, fontSize: 14, textDecoration: "none",
              }}>
              <Clock size={15} /> Set Availability
            </Link>
            <button onClick={logout} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#FEF2F2", color: "#EF4444",
              border: "none", borderRadius: 99, padding: "10px 18px",
              fontWeight: 700, fontSize: 14, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px" }}>

        {/* Page heading */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: "#1a1a2e", fontSize: 32, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.5px" }}>
            Doctor Dashboard
          </h1>
          <p style={{ color: "#6b7280", fontSize: 17, margin: 0 }}>
            Click any appointment to see full details and patient files.
          </p>
        </div>

        {/* Shared records notifications */}
        <div style={{
          background: "white", borderRadius: 20,
          border: "1.5px solid #C7D9FF",
          padding: "16px 18px",
          marginBottom: 22,
          boxShadow: "0 2px 8px rgba(59,111,232,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, background: "#EEF4FF",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <BellRing size={16} style={{ color: "#3B6FE8" }} />
            </div>
            <p style={{ color: "#1a1a2e", fontSize: 16, fontWeight: 800, margin: 0 }}>
              Shared Records Alerts
            </p>
          </div>
          {sharedNotifications.length === 0 ? (
            <p style={{ margin: 0, color: "#9CA3AF", fontSize: 14 }}>
              No new shared reports yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sharedNotifications.slice(0, 3).map((n: any) => (
                <div key={n.permission_id} style={{
                  background: "#F9FAFB", border: "1px solid #EEF4FF", borderRadius: 12, padding: "10px 12px",
                }}>
                  <p style={{ margin: 0, color: "#1a1a2e", fontSize: 13, fontWeight: 700 }}>
                    {n.patient_name} shared a {n.report_type} report
                  </p>
                  <p style={{ margin: "2px 0 0", color: "#6B7280", fontSize: 12 }}>
                    {n.file_name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 36 }}>
          {[
            { label: "Pending",   count: groupedAppts.PENDING.length,   bg: "#FEF9C3", color: "#854D0E", border: "#FDE68A" },
            { label: "Confirmed", count: groupedAppts.CONFIRMED.length, bg: "#DCFCE7", color: "#166534", border: "#86EFAC" },
            { label: "Completed", count: groupedAppts.COMPLETED.length, bg: "#EEF4FF", color: "#1e40af", border: "#C7D9FF" },
            { label: "Cancelled", count: groupedAppts.CANCELLED.length, bg: "#FEE2E2", color: "#991B1B", border: "#FECACA" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 20, padding: "20px 22px", border: `1.5px solid ${s.border}` }}>
              <p style={{ color: s.color, fontSize: 32, fontWeight: 900, margin: "0 0 2px" }}>{s.count}</p>
              <p style={{ color: s.color, fontSize: 14, fontWeight: 700, margin: 0, opacity: 0.8 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Appointment list */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: "4px solid #C7D9FF", borderTopColor: "#3B6FE8", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 80 }}>
            <Calendar size={52} style={{ color: "#C7D9FF", margin: "0 auto 16px" }} />
            <p style={{ color: "#1a1a2e", fontWeight: 800, fontSize: 20 }}>No appointments yet</p>
            <p style={{ color: "#9CA3AF", fontSize: 16 }}>Patients will appear here once they book.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {appointments.map((appt: any) => {
              const st = STATUS_STYLE[appt.status] ?? STATUS_STYLE.PENDING;
              return (
                <div
                  key={appt.id}
                  className="appt-card"
                  onClick={() => setSelected(appt)}
                  style={{
                    background: "white", borderRadius: 22,
                    border: "1.5px solid #C7D9FF",
                    padding: "22px 28px",
                    display: "flex", alignItems: "center", gap: 20,
                    boxShadow: "0 2px 8px rgba(59,111,232,0.06)",
                  }}
                >
                  {/* Left colour strip */}
                  <div style={{ width: 4, height: 52, borderRadius: 99, background: st.color, flexShrink: 0 }} />

                  {/* Main info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <Badge label={appt.status} {...st} />
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: "#EEF4FF", color: "#3B6FE8",
                        borderRadius: 99, padding: "3px 12px", fontSize: 12, fontWeight: 700,
                      }}>
                        {appt.consultation_type === "VIDEO" ? <><Video size={11} /> Video</> : <><Building2 size={11} /> In-Person</>}
                      </span>
                    </div>
                    <p style={{ color: "#1a1a2e", fontWeight: 900, fontSize: 18, margin: "0 0 2px", letterSpacing: "-0.2px" }}>
                      {appt.patient_name || "Patient"}
                    </p>
                    <p style={{ color: "#1a1a2e", fontWeight: 800, fontSize: 15, margin: "0 0 4px" }}>
                      {new Date(appt.scheduled_at).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}
                    </p>
                    {appt.notes && (
                      <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
                        Notes: {appt.notes}
                      </p>
                    )}
                  </div>

                  {/* Right: fee + chevron */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ color: "#16A34A", fontWeight: 900, fontSize: 20, margin: "0 0 2px" }}>₹{appt.payment_amount}</p>
                      <Badge label={appt.payment_status} {...PAY_STYLE[appt.payment_status] ?? PAY_STYLE.PENDING} />
                    </div>
                    <ChevronRight size={20} style={{ color: "#C7D9FF" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <AppointmentModal
          appt={selected}
          onClose={() => { setSelected(null); void Promise.all([fetchAppointments(), fetchSharedNotifications()]); }}
        />
      )}
    </div>
  );
}