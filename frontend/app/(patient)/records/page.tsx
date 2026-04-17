"use client";
import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { getUser, logout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    void Promise.all([fetchFiles(), fetchDoctors(), fetchAppointments(), fetchShares()]);
  }, [router]);

  const fetchFiles = async () => {
    try {
      const res = await api.get("/files/mine");
      setFiles(res.data.data);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard"
            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600">
            <ChevronLeft size={20} /> Dashboard
          </Link>
          <button onClick={logout}
            className="flex items-center gap-1 text-red-500 text-sm">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Medical Records</h2>
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
          <p className="text-blue-700 text-sm">
            🔒 Your files are stored privately. Only you can see them unless you explicitly share with a doctor.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">No files uploaded yet.</p>
            <p className="text-gray-400 text-sm mt-1">
              Click &quot;Upload File&quot; to add your first medical record.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {files.map((file) => (
              <div key={file.id}
                className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FileText className="text-purple-600" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{file.name}</p>
                      <p className="text-gray-400 text-xs mt-0.5">
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
                            <div className="mt-1 opacity-90">{st.label}</div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {sharing === file.id && (
                  <div className="mt-4 bg-gray-50 rounded-xl p-4 border">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      Share with a Doctor
                    </p>

                    {doctors.length === 0 ? (
                      <p className="text-gray-400 text-sm">
                        No approved doctors found.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <select
                          value={shareForm.doctor_id}
                          onChange={(e) => setShareForm({
                            ...shareForm, doctor_id: e.target.value
                          })}
                          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
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
                          <span className="text-xs font-medium text-gray-600">Access Start</span>
                          <input
                            type="datetime-local"
                            value={shareForm.start_date}
                            onChange={(e) => setShareForm({
                              ...shareForm, start_date: e.target.value
                            })}
                            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-gray-600">Access End</span>
                          <input
                            type="datetime-local"
                            value={shareForm.end_date}
                            onChange={(e) => setShareForm({
                              ...shareForm, end_date: e.target.value
                            })}
                            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
                          />
                        </label>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      Access end time is enforced by the system and expires at your next appointment conclusion.
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