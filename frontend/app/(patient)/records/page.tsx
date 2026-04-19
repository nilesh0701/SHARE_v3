"use client";
import { useEffect, useRef, useState } from "react";
import api from "@/lib/axios";
import { getUser, logout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/theme/theme-toggle";
import { FileText, Upload, Share2, XCircle, LogOut, ChevronLeft, Trash2 } from "lucide-react";

type MedicalFile = {
  id: string;
  name: string;
  cloudinary_url: string;
  size_bytes: number;
  uploaded_at: string;
};

type DoctorOption = {
  user_id: string;
  full_name: string;
  specialty: string;
};

type Appointment = {
  doctor_id: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  scheduled_at: string;
  consultation_type: "VIDEO" | "IN_PERSON";
};

type SharePermission = {
  permission_id: string;
  file_id: string;
  doctor_id: string;
  doctor_name: string;
  file_name: string;
  granted_at: string;
  expires_at: string;
  revoked_at: string | null;
};

type Feedback = {
  kind: "success" | "error";
  message: string;
} | null;

export default function RecordsPage() {
  const [files, setFiles] = useState<MedicalFile[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [eligibleDoctorIds, setEligibleDoctorIds] = useState<Set<string>>(new Set());
  const [shares, setShares] = useState<SharePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [shareForm, setShareForm] = useState({ doctor_id: "", start_date: "", end_date: "" });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    if (u.role !== "PATIENT") { router.push("/login"); return; }
    void Promise.all([fetchFiles(), fetchDoctors(), fetchAppointments(), fetchShares()]);
  }, [router]);

  const fetchFiles = async () => {
    try {
      const res = await api.get("/files/mine");
      setFiles(res.data.data);
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err && "response" in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 401 || status === 403) {
        router.push("/login");
        return;
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await api.get("/doctors");
      setDoctors(res.data.data);
    } catch {}
  };

  const fetchShares = async () => {
    try {
      const res = await api.get("/files/shares");
      setShares(res.data.data ?? []);
    } catch {
      setShares([]);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await api.get("/appointments/mine");
      const appts = res.data.data as Appointment[];
      setAppointments(appts);
      const allowed = new Set(
        appts
          .filter((a) => a.status !== "CANCELLED")
          .map((a) => a.doctor_id)
      );
      setEligibleDoctorIds(allowed);
    } catch {
      setEligibleDoctorIds(new Set());
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      await api.post("/files", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setFeedback({ kind: "success", message: "File uploaded successfully." });
      void fetchFiles();
    } catch (err: unknown) {
      const detail =
        typeof err === "object" && err && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setFeedback({ kind: "error", message: detail || "Upload failed" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const canSubmitShare =
    Boolean(shareForm.doctor_id) &&
    Boolean(shareForm.start_date) &&
    Boolean(shareForm.end_date) &&
    eligibleDoctorIds.has(shareForm.doctor_id) &&
    new Date(shareForm.end_date).getTime() > new Date(shareForm.start_date).getTime();

  const formatForInput = (d: Date) => {
    const pad = (v: number) => String(v).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const getSuggestedWindow = () => {
    if (!shareForm.doctor_id) return null;
    const now = new Date();
    const doctorAppts = appointments
      .filter(
        (a) =>
          a.doctor_id === shareForm.doctor_id &&
          a.status !== "CANCELLED" &&
          new Date(a.scheduled_at).getTime() > now.getTime()
      )
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    if (!doctorAppts.length) return null;
    const nearest = doctorAppts[0];
    const start = now;
    const end = new Date(nearest.scheduled_at);
    if (end.getTime() <= start.getTime()) return null;
    return {
      start: formatForInput(start),
      end: formatForInput(end),
      meetingType: nearest.consultation_type,
      endLabel: end.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    };
  };

  const suggestion = getSuggestedWindow();

  useEffect(() => {
    if (!shareForm.doctor_id) return;
    if (shareForm.start_date || shareForm.end_date) return;
    if (!suggestion) return;
    setShareForm((prev) => ({
      ...prev,
      start_date: suggestion.start,
      end_date: suggestion.end,
    }));
  }, [shareForm.doctor_id, suggestion, shareForm.start_date, shareForm.end_date]);

  const handleShare = async (fileId: string) => {
    setError("");
    if (!shareForm.doctor_id) {
      setError("Please select a doctor");
      return;
    }
    if (!eligibleDoctorIds.has(shareForm.doctor_id)) {
      setError("You can only share with doctors you have a non-cancelled appointment with.");
      return;
    }
    if (!shareForm.start_date || !shareForm.end_date) {
      setError("Please set both start and end access dates");
      return;
    }
    if (new Date(shareForm.end_date).getTime() <= new Date(shareForm.start_date).getTime()) {
      setError("End date must be after start date");
      return;
    }
    try {
      await api.post(`/files/${fileId}/share`, {
        doctor_id: shareForm.doctor_id,
        start_date: new Date(shareForm.start_date).toISOString(),
        end_date: new Date(shareForm.end_date).toISOString(),
      });
      setFeedback({ kind: "success", message: "File shared successfully." });
      setSharing(null);
      setShareForm({ doctor_id: "", start_date: "", end_date: "" });
      void fetchShares();
    } catch (err: unknown) {
      const detail =
        typeof err === "object" && err && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setError(detail || "Share failed");
    }
  };

  const handleRevoke = async (fileId: string) => {
    if (!confirm("Revoke all access to this file?")) return;
    try {
      await api.post(`/files/${fileId}/revoke`);
      setFeedback({ kind: "success", message: "Access revoked successfully." });
      void fetchShares();
    } catch (err: unknown) {
      const detail =
        typeof err === "object" && err && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setFeedback({ kind: "error", message: detail || "Revoke failed" });
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Delete this uploaded file permanently from your list?")) return;
    setDeletingFileId(fileId);
    try {
      await api.delete(`/files/${fileId}`);
      setFeedback({ kind: "success", message: "File deleted successfully." });
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setShares((prev) => prev.filter((s) => s.file_id !== fileId));
      if (sharing === fileId) {
        setSharing(null);
      }
    } catch (err: unknown) {
      const detail =
        typeof err === "object" && err && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setFeedback({ kind: "error", message: detail || "Delete failed" });
    } finally {
      setDeletingFileId(null);
    }
  };

  const extendOptions = [
    { label: "Extend by 24 Hours", value: "24H" as const, seconds: 24 * 3600 },
    { label: "Extend by 3 Days", value: "3D" as const, seconds: 3 * 24 * 3600 },
    { label: "Extend by 1 Week", value: "1W" as const, seconds: 7 * 24 * 3600 },
  ];

  const [extendingPermissionId, setExtendingPermissionId] = useState<string | null>(null);
  const [extendChoiceByPermission, setExtendChoiceByPermission] = useState<Record<string, "24H" | "3D" | "1W">>({});
  const extendDebounceRef = useRef<Record<string, number>>({});

  const extendAccess = async (permissionId: string) => {
    const now = Date.now();
    const last = extendDebounceRef.current[permissionId] ?? 0;
    if (now - last < 900) return; // debounce rapid clicks
    extendDebounceRef.current[permissionId] = now;

    const choice = extendChoiceByPermission[permissionId] ?? "24H";
    setExtendingPermissionId(permissionId);
    try {
      const res = await api.post(`/files/permissions/${permissionId}/extend`, { extend_by: choice });
      const newExpiresAt = res.data?.data?.expires_at as string | undefined;
      if (newExpiresAt) {
        setShares((prev) =>
          prev.map((p) => (p.permission_id === permissionId ? { ...p, expires_at: newExpiresAt } : p))
        );
      } else {
        // Fallback: optimistic update if API shape changes
        const optSeconds = extendOptions.find((o) => o.value === choice)?.seconds ?? 0;
        setShares((prev) =>
          prev.map((p) => {
            if (p.permission_id !== permissionId) return p;
            const cur = new Date(p.expires_at).getTime();
            return { ...p, expires_at: new Date(cur + optSeconds * 1000).toISOString() };
          })
        );
      }
      setFeedback({ kind: "success", message: "Access extended successfully." });
    } catch (err: unknown) {
      const detail =
        typeof err === "object" && err && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setFeedback({ kind: "error", message: detail || "Failed to extend access" });
    } finally {
      setExtendingPermissionId(null);
    }
  };

  const getAccessStatus = (p: SharePermission) => {
    const now = new Date().getTime();
    if (p.revoked_at) return { label: "Revoked", cls: "bg-red-50 text-red-700 border-red-200" };
    const exp = new Date(p.expires_at).getTime();
    if (exp <= now) return { label: "Expired", cls: "bg-gray-50 text-gray-700 border-gray-200" };
    const diffMs = exp - now;
    const totalMins = Math.max(1, Math.floor(diffMs / 60000));
    const hrs = Math.floor(totalMins / 60);
    const days = Math.floor(hrs / 24);
    const remHrs = hrs % 24;
    const remaining =
      days >= 1 ? `${days}d ${remHrs}h left` : hrs >= 1 ? `${hrs}h left` : `${totalMins}m left`;
    const expLabel = new Date(p.expires_at).toLocaleString("en-IN", { weekday: "long", hour: "numeric", minute: "2-digit" });
    return { label: `Access: ${remaining} · Expires after ${expLabel}`, cls: "bg-blue-50 text-blue-700 border-blue-200" };
  };

  const getExpiryMeta = (p: SharePermission) => {
    if (p.revoked_at) return { state: "revoked" as const, remainingMs: 0 };
    const now = Date.now();
    const exp = new Date(p.expires_at).getTime();
    const remainingMs = exp - now;
    if (remainingMs <= 0) return { state: "expired" as const, remainingMs };
    // show Continue Access within 1 hour and 1 minute
    if (remainingMs <= (61 * 60 * 1000)) return { state: "soon" as const, remainingMs };
    return { state: "ok" as const, remainingMs };
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <nav className="shadow-sm border-b" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard"
            className="flex items-center gap-2 hover:text-indigo-600"
            style={{ color: "var(--app-muted)" }}
          >
            <ChevronLeft size={20} /> Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle size="sm" />
            <button onClick={logout}
              className="flex items-center gap-1 text-sm"
              style={{ color: "var(--app-danger)" }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{ color: "var(--app-fg)" }}>My Medical Records</h2>
          <label className={`bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold cursor-pointer hover:bg-indigo-700 flex items-center gap-2 ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
            <Upload size={18} />
            {uploading ? "Uploading..." : "Upload File"}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {feedback && (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              feedback.kind === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm" style={{ color: "var(--app-primary)" }}>
            🔒 Your files are stored privately. Only you can see them unless you explicitly share with a doctor.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20" style={{ color: "var(--app-muted)" }}>Loading...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={48} className="mx-auto mb-4" style={{ color: "var(--app-border)" }} />
            <p style={{ color: "var(--app-muted)" }}>No files uploaded yet.</p>
            <p className="text-sm mt-1" style={{ color: "var(--app-muted)" }}>
              Click &quot;Upload File&quot; to add your first medical record.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {files.map((file) => (
              <div key={file.id}
                className="rounded-2xl shadow-sm border p-6"
                style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--app-surface-2)" }}>
                      <FileText style={{ color: "var(--app-primary)" }} size={20} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: "var(--app-fg)" }}>{file.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--app-muted)" }}>
                        {(file.size_bytes / 1024).toFixed(1)} KB ·{" "}
                        {new Date(file.uploaded_at).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    
                     <a href={file.cloudinary_url} target="_blank" rel="noreferrer"
  className="text-indigo-600 hover:underline text-sm">View</a>
                    <button
                      onClick={() => {
                        setSharing(sharing === file.id ? null : file.id);
                        setError("");
                        setShareForm({ doctor_id: "", start_date: "", end_date: "" });
                      }}
                      className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm hover:bg-green-200"
                    >
                      <Share2 size={14} /> Share
                    </button>
                    <button
                      onClick={() => handleRevoke(file.id)}
                      className="flex items-center gap-1 bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-sm hover:bg-red-200"
                    >
                      <XCircle size={14} /> Revoke
                    </button>
                    <button
                      onClick={() => void handleDeleteFile(file.id)}
                      disabled={deletingFileId === file.id}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${
                        deletingFileId === file.id
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                      }`}
                    >
                      <Trash2 size={14} /> {deletingFileId === file.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>

                {/* Shared access status */}
                {shares.filter((p) => p.file_id === file.id).length > 0 && (
                  <div className="mt-3 space-y-2">
                    {shares
                      .filter((p) => p.file_id === file.id)
                      .slice(0, 3)
                      .map((p) => {
                        const st = getAccessStatus(p);
                        const meta = getExpiryMeta(p);
                        return (
                          <div
                            key={p.permission_id}
                            className={`rounded-xl border px-3 py-2 text-xs ${st.cls}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">Shared with Dr. {p.doctor_name}</span>
                              <span className="font-medium">
                                {p.revoked_at ? "Revoked" : new Date(p.expires_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <span className="opacity-90">{st.label}</span>
                              {meta.state === "soon" && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                  Expiring Soon
                                </span>
                              )}
                              {meta.state === "expired" && (
                                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                                  Expired
                                </span>
                              )}
                            </div>

                            {meta.state === "soon" && !p.revoked_at && (
                              <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-900 border border-amber-200">
                                Your shared reports with Dr. {p.doctor_name} will be revoked on{" "}
                                {new Date(p.expires_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}. Do you want to continue sharing?
                              </div>
                            )}

                            {(meta.state === "soon" || meta.state === "expired") && !p.revoked_at && (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <select
                                  value={extendChoiceByPermission[p.permission_id] ?? "24H"}
                                  onChange={(e) =>
                                    setExtendChoiceByPermission((prev) => ({
                                      ...prev,
                                      [p.permission_id]: e.target.value as "24H" | "3D" | "1W",
                                    }))
                                  }
                                  className="rounded-lg border px-2 py-1 text-xs"
                                  style={{ borderColor: "var(--app-border)", background: "var(--app-surface)", color: "var(--app-fg)" }}
                                >
                                  {extendOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => void extendAccess(p.permission_id)}
                                  disabled={extendingPermissionId === p.permission_id}
                                  className={`rounded-lg px-3 py-1 text-xs font-semibold shadow-sm ${
                                    extendingPermissionId === p.permission_id
                                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                                  }`}
                                >
                                  {extendingPermissionId === p.permission_id ? "Extending..." : "Continue Access"}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {sharing === file.id && (
                  <div className="mt-4 rounded-xl p-4 border" style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border)" }}>
                    <p className="text-sm font-medium mb-3" style={{ color: "var(--app-fg)" }}>
                      Share with a Doctor
                    </p>

                    {doctors.length === 0 ? (
                      <p className="text-sm" style={{ color: "var(--app-muted)" }}>
                        No approved doctors found.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <select
                          value={shareForm.doctor_id}
                          onChange={(e) => setShareForm({
                            ...shareForm, doctor_id: e.target.value
                          })}
                          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          style={{ borderColor: "var(--app-border)", background: "var(--app-surface)", color: "var(--app-fg)" }}
                        >
                          <option value="">Select a doctor...</option>
                          {doctors.map((doc) => (
                            <option
                              key={doc.user_id}
                              value={doc.user_id}
                              disabled={!eligibleDoctorIds.has(doc.user_id)}
                            >
                              Dr. {doc.full_name} — {doc.specialty}
                              {!eligibleDoctorIds.has(doc.user_id) ? " (No active appointment)" : ""}
                            </option>
                          ))}
                        </select>

                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium" style={{ color: "var(--app-muted)" }}>Access Start</span>
                          <input
                            type="datetime-local"
                            value={shareForm.start_date}
                            onChange={(e) => setShareForm({
                              ...shareForm, start_date: e.target.value
                            })}
                            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            style={{ borderColor: "var(--app-border)", background: "var(--app-surface)", color: "var(--app-fg)" }}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium" style={{ color: "var(--app-muted)" }}>Access End</span>
                          <input
                            type="datetime-local"
                            value={shareForm.end_date}
                            onChange={(e) => setShareForm({
                              ...shareForm, end_date: e.target.value
                            })}
                            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            style={{ borderColor: "var(--app-border)", background: "var(--app-surface)", color: "var(--app-fg)" }}
                          />
                        </label>
                      </div>
                    )}

                    <p className="text-xs mt-2" style={{ color: "var(--app-muted)" }}>
                      Tip: The appointment window is only a suggestion. You can adjust the end time manually, and SHARE will use the selected end time.
                    </p>

                    {suggestion && (
                      <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                        <p className="text-xs text-blue-700 mb-2">
                          Suggested: Share until your next {suggestion.meetingType === "VIDEO" ? "video" : "in-person"} appointment at {suggestion.endLabel}.
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setShareForm((prev) => ({
                              ...prev,
                              start_date: suggestion.start,
                              end_date: suggestion.end,
                            }))
                          }
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          Use appointment time window
                        </button>
                      </div>
                    )}

                    {error && (
                      <p className="text-red-500 text-sm mt-2">{error}</p>
                    )}

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleShare(file.id)}
                        disabled={!canSubmitShare}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          canSubmitShare
                            ? "bg-indigo-600 text-white hover:bg-indigo-700"
                            : "bg-gray-200 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        Confirm Share
                      </button>
                      <button
                        onClick={() => setSharing(null)}
                        className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-200"
                      >
                        Cancel
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