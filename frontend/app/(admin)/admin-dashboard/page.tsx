"use client";
import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { getUser, getStoredToken, logout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, LogOut, Users, Calendar, FileText, Clock } from "lucide-react";
import ThemeToggle from "@/components/theme/theme-toggle";

export default function AdminDashboard() {
  const [pending, setPending] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [showDoctors, setShowDoctors] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "ADMIN") { router.push("/login"); return; }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pendingRes, reportsRes] = await Promise.all([
        api.get("/admin/pending-doctors"),
        api.get("/admin/reports"),
      ]);
      setPending(pendingRes.data.data);
      setReports(reportsRes.data.data);
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id: string) => {
    try {
      await api.put(`/admin/doctors/${id}/approve`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed");
    }
  };

  const reject = async (id: string) => {
    try {
      await api.put(`/admin/doctors/${id}/reject`, { reason: rejectReason });
      setRejectId(null);
      setRejectReason("");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed");
    }
  };

  const downloadCertificate = (doctorId: string, doctorName: string) => {
    const token = getStoredToken();
    if (!token) {
      alert("Session expired. Please login again.");
      return;
    }
    const baseUrl = api.defaults.baseURL;
    const url = `${baseUrl}/admin/doctors/${doctorId}/certificate/download?access_token=${encodeURIComponent(token)}`;

    const link = document.createElement("a");
    link.href = url;
    link.download = `${doctorName.replace(/\s+/g, "_")}_certificate`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadDoctors = async () => {
    setDoctorsLoading(true);
    try {
      const res = await api.get("/admin/doctors");
      setDoctors(res.data.data ?? []);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to load doctors");
    } finally {
      setDoctorsLoading(false);
    }
  };

  const toggleDoctorsPanel = async () => {
    const next = !showDoctors;
    setShowDoctors(next);
    if (next && doctors.length === 0) {
      await loadDoctors();
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <nav className="shadow-sm border-b" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-indigo-600">SHARE — Admin</h1>
          <div className="flex items-center gap-3">
            <ThemeToggle size="sm" />
            <button onClick={logout} className="flex items-center gap-1 text-sm" style={{ color: "var(--app-danger)" }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold mb-8" style={{ color: "var(--app-fg)" }}>Admin Dashboard</h2>

        {/* Stats */}
        {reports && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Doctors", value: reports.total_doctors, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "Total Patients", value: reports.total_patients, icon: Users, color: "text-green-600", bg: "bg-green-50" },
              { label: "Total Appointments", value: reports.total_appointments, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Pending Reviews", value: reports.pending_verifications, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
            ].map((stat) => (
              <button
                key={stat.label}
                type="button"
                onClick={stat.label === "Total Doctors" ? () => void toggleDoctorsPanel() : undefined}
                className={`bg-white rounded-2xl shadow-sm border p-5 text-left w-full ${
                  stat.label === "Total Doctors" ? "cursor-pointer hover:border-indigo-300 transition" : "cursor-default"
                } ${showDoctors && stat.label === "Total Doctors" ? "border-indigo-500 ring-2 ring-indigo-100" : ""}`}
              >
                <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
                  <stat.icon className={stat.color} size={20} />
                </div>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-gray-500 text-sm">{stat.label}</p>
              </button>
            ))}
          </div>
        )}

        {showDoctors && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
            <h3 className="font-semibold text-gray-800 text-lg mb-4">Registered Doctors</h3>
            {doctorsLoading ? (
              <div className="text-center py-8 text-gray-400">Loading doctors...</div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No doctors found.</div>
            ) : (
              <div className="space-y-3">
                {doctors.map((doc: any) => (
                  <div key={doc.user_id} className="border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-800">Dr. {doc.full_name}</p>
                        <p className="text-indigo-600 text-sm">{doc.specialty}</p>
                        <p className="text-gray-500 text-sm mt-1">{doc.email}</p>
                        <p className="text-gray-500 text-sm">
                          {doc.consultation_type} · ₹{doc.consultation_fee}
                          {doc.gender ? ` · ${doc.gender}` : ""}
                        </p>
                        {doc.clinic_address && (
                          <p className="text-gray-500 text-sm">Clinic: {doc.clinic_address}</p>
                        )}
                        {doc.bio && (
                          <p className="text-gray-500 text-sm mt-1">{doc.bio}</p>
                        )}
                      </div>
                      <div className="text-right text-xs">
                        <p className={`font-semibold ${doc.verification_status === "APPROVED" ? "text-green-600" : doc.verification_status === "REJECTED" ? "text-red-600" : "text-yellow-600"}`}>
                          {doc.verification_status}
                        </p>
                        <p className="text-gray-400">{doc.account_status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Doctors */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-800 text-lg mb-4">
            Pending Doctor Verifications
            {pending.length > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </h3>

          {loading ? (
            <div className="text-center py-10 text-gray-400">Loading...</div>
          ) : pending.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle size={40} className="text-green-300 mx-auto mb-3" />
              <p className="text-gray-400">No pending verifications. All caught up!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((doc: any) => (
                <div key={doc.user_id} className="border rounded-xl p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-800">Dr. {doc.full_name}</h4>
                      <p className="text-indigo-600 text-sm">{doc.specialty}</p>
                      <p className="text-gray-500 text-sm mt-1">{doc.email}</p>
                      <p className="text-gray-500 text-sm">
                        {doc.consultation_type} · ₹{doc.consultation_fee}
                      </p>
                      {doc.bio && <p className="text-gray-500 text-sm mt-1 line-clamp-2">{doc.bio}</p>}
                      {doc.certificate_url && (
                        <button
                          type="button"
                          onClick={() => downloadCertificate(doc.user_id, doc.full_name)}
                          className="text-indigo-600 hover:underline text-sm mt-2 inline-flex items-center gap-1">
                          <FileText size={14} /> Download Certificate
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <button onClick={() => approve(doc.user_id)}
                        className="flex items-center gap-1 bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200">
                        <CheckCircle size={16} /> Approve
                      </button>
                      <button onClick={() => setRejectId(doc.user_id)}
                        className="flex items-center gap-1 bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200">
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  </div>

                  {rejectId === doc.user_id && (
                    <div className="mt-4 bg-red-50 rounded-xl p-4">
                      <textarea
                        placeholder="Reason for rejection..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-2"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => reject(doc.user_id)}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600">
                          Confirm Reject
                        </button>
                        <button onClick={() => setRejectId(null)}
                          className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
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
    </div>
  );
}