"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { getUser, logout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BadgeCheck,
  Bell,
  Calendar,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  KeyRound,
  LogOut,
  Search,
  Share2,
  ShieldCheck,
  Video,
  FileText,
} from "lucide-react";

const specialties = [
  { name: "Physician",     icon: "🩺", query: "Physician" },
  { name: "Dentist",       icon: "🦷", query: "Dentist" },
  { name: "OB-GYN",        icon: "👶", query: "Gynecologist" },
  { name: "Dermatologist", icon: "🧴", query: "Dermatologist" },
  { name: "Psychiatrist",  icon: "🧠", query: "Psychiatrist" },
  { name: "Eye Doctor",    icon: "👁️", query: "Ophthalmologist" },
  { name: "Cardiologist",  icon: "❤️", query: "Cardiologist" },
  { name: "Orthopedic",    icon: "🦴", query: "Orthopedic" },
  { name: "Pediatrician",  icon: "🍼", query: "Pediatrician" },
];

const quickActions = [
  {
    label: "My Appointments",
    desc: "View & manage upcoming visits",
    href: "/appointments",
    icon: Calendar,
    bg: "#3B6FE8",
  },
  {
    label: "Medical Records",
    desc: "Upload & share your files",
    href: "/records",
    icon: FileText,
    bg: "#2563EB",
  },
];

type FaqItem = {
  q: string;
  a: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const faqItems: FaqItem[] = [
  {
    q: "How secure are my medical records?",
    a: "All files are encrypted and stored on Cloudinary. Only doctors you explicitly grant access to can view them.",
    icon: ShieldCheck,
  },
  {
    q: "How do I share a file with my doctor?",
    a: "Go to 'Medical Records', click 'Share', and enter your doctor's unique ID along with an expiry date.",
    icon: Share2,
  },
  {
    q: "Can I revoke access to my files?",
    a: "Yes, you can revoke access at any time from your 'Records' tab. Access is cut off immediately.",
    icon: KeyRound,
  },
  {
    q: "Are the doctors on SHARE verified?",
    a: "Yes, every doctor must submit their medical certificate and is manually verified by our administrative team before they can accept appointments.",
    icon: BadgeCheck,
  },
  {
    q: "How do video appointments work?",
    a: "Once a doctor confirms your appointment, a Jitsi meeting link will appear in your 'Appointments' tab at the scheduled time.",
    icon: Video,
  },
];

function FaqAccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [maxHeight, setMaxHeight] = useState<number>(0);

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    setMaxHeight(isOpen ? el.scrollHeight : 0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const el = panelRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      setMaxHeight(el.scrollHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  const Icon = item.icon;

  return (
    <div className="rounded-2xl border border-[#C7D9FF] bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="w-full px-5 py-4 flex items-start gap-3 text-left"
      >
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#3B6FE8]">
          <Icon size={18} />
        </span>
        <span className="flex-1">
          <span className="block text-[15px] sm:text-[16px] font-extrabold text-[#1a1a2e] leading-snug">
            {item.q}
          </span>
        </span>
        <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#3B6FE8]">
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
          />
        </span>
      </button>

      <div
        id={contentId}
        style={{ maxHeight }}
        className="overflow-hidden transition-[max-height] duration-300 ease-out"
      >
        <div ref={panelRef} className="px-5 pb-5 -mt-1">
          <p className="text-[14px] sm:text-[15px] text-[#6b7280] leading-relaxed">
            {item.a}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PatientDashboard() {
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [logoHovered, setLogoHovered] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    if (u.role !== "PATIENT") { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  if (!user) return null;

  const firstName = user.email?.split("@")[0] || "there";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(searchQuery.trim()
      ? `/search?specialty=${encodeURIComponent(searchQuery.trim())}`
      : "/search"
    );
  };

  return (
    <div className="min-h-screen" style={{ background: "#EEF4FF", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&display=swap');
        * { box-sizing: border-box; }
        .specialty-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .specialty-card:hover { transform: translateY(-6px); box-shadow: 0 14px 34px rgba(59,111,232,0.22) !important; }
        .quick-card { transition: transform 0.18s ease, opacity 0.18s ease; }
        .quick-card:hover { opacity: 0.91; transform: translateY(-4px); }
        input:focus, select:focus, textarea:focus { outline: none; }
      `}</style>

      {/* ── NAV ── */}
      <nav className="bg-white sticky top-0 z-20" style={{ borderBottom: "1px solid #C7D9FF" }}>
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">

          {/* ── ANIMATED LOGO ── */}
          <div
            style={{ display: "flex", alignItems: "center", overflow: "hidden", cursor: "default", userSelect: "none" }}
            onMouseEnter={() => setLogoHovered(true)}
            onMouseLeave={() => setLogoHovered(false)}
          >
            {/* Icon + SHARE — both move left together */}
            <div style={{
              display: "flex", alignItems: "center", gap: 14, flexShrink: 0,
              transform: logoHovered ? "translateX(-8px)" : "translateX(0)",
              transition: "transform 0.38s cubic-bezier(0.34,1.56,0.64,1)",
            }}>
              <div style={{
                width: 52, height: 52, background: "#3B6FE8", borderRadius: 16, flexShrink: 0,
                boxShadow: logoHovered ? "0 6px 20px rgba(59,111,232,0.55)" : "0 4px 14px rgba(59,111,232,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                transform: logoHovered ? "scale(1.08) rotate(-3deg)" : "scale(1) rotate(0deg)",
              }}>
                <span style={{ color: "white", fontWeight: 900, fontSize: 24, letterSpacing: "-1px" }}>S</span>
              </div>
              <span style={{ fontWeight: 900, fontSize: 28, color: "#1a1a2e", letterSpacing: "-0.5px", whiteSpace: "nowrap" }}>
                SHARE
              </span>
            </div>

            {/* Full form — slides in from right after icon+SHARE move */}
            <span style={{
              fontWeight: 600, fontSize: 14, color: "#3B6FE8",
              whiteSpace: "nowrap", letterSpacing: "0.01em",
              marginLeft: 8,
              opacity: logoHovered ? 1 : 0,
              transform: logoHovered ? "translateX(-8px)" : "translateX(36px)",
              transition: logoHovered
                ? "opacity 0.28s ease 0.12s, transform 0.42s cubic-bezier(0.34,1.56,0.64,1) 0.08s"
                : "opacity 0.15s ease, transform 0.2s ease",
              pointerEvents: "none",
            }}>
              — Secure Health Access and Record Exchange
            </span>
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: "50%",
              background: "#EEF4FF", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer",
            }}>
              <Bell size={20} style={{ color: "#3B6FE8" }} />
            </div>
            <div style={{
              width: 42, height: 42, borderRadius: "50%",
              background: "linear-gradient(135deg,#3B6FE8,#6B99FF)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, color: "white", fontSize: 18,
            }}>
              {firstName.charAt(0).toUpperCase()}
            </div>
            <button onClick={logout} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#FEF2F2", color: "#EF4444",
              border: "none", borderRadius: 99, padding: "10px 18px",
              fontWeight: 700, fontSize: 15, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              <LogOut size={15} /> Logout
            </button>
          </div>
        </div>
      </nav>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px", display: "flex", flexDirection: "column", gap: 32 }}>

        {/* HERO */}
        <div style={{
          borderRadius: 28, padding: "44px 48px",
          background: "linear-gradient(135deg,#3B6FE8 0%,#6B99FF 55%,#93C5FD 100%)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
          <div style={{ position: "absolute", bottom: -50, right: 60, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Good day 👋</p>
            <h1 style={{ color: "white", fontSize: 38, fontWeight: 900, letterSpacing: "-1px", margin: "0 0 8px" }}>
              Hello, {firstName}!
            </h1>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 18, marginBottom: 28 }}>
              How are you feeling today? Find a verified doctor near you.
            </p>
            <form onSubmit={handleSearch}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "white", borderRadius: 18, padding: "12px 16px",
                maxWidth: 500, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              }}>
                <Search size={20} style={{ color: "#3B6FE8", flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search doctor, specialty…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1, border: "none", background: "transparent",
                    color: "#1a1a2e", fontSize: 17, fontFamily: "'DM Sans', sans-serif",
                  }}
                />
                <button type="submit" style={{
                  background: "#3B6FE8", color: "white", border: "none",
                  borderRadius: 12, padding: "10px 22px", fontWeight: 700,
                  fontSize: 16, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  boxShadow: "0 2px 8px rgba(59,111,232,0.35)",
                }}>
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {quickActions.map((a) => (
            <Link key={a.label} href={a.href}
              className="quick-card"
              style={{
                background: a.bg, borderRadius: 24, padding: "28px 28px",
                display: "flex", alignItems: "center", gap: 18,
                textDecoration: "none", boxShadow: "0 4px 16px rgba(59,111,232,0.25)",
              }}>
              <div style={{
                width: 60, height: 60, borderRadius: 18, flexShrink: 0,
                background: "rgba(255,255,255,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <a.icon size={30} color="white" />
              </div>
              <div>
                <p style={{ color: "white", fontWeight: 800, fontSize: 19, margin: 0 }}>{a.label}</p>
                <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 15, margin: "4px 0 0" }}>{a.desc}</p>
              </div>
              <ChevronRight size={22} color="rgba(255,255,255,0.5)" style={{ marginLeft: "auto", flexShrink: 0 }} />
            </Link>
          ))}
        </div>

        {/* SPECIALTIES */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ color: "#1a1a2e", fontSize: 24, fontWeight: 900, margin: 0 }}>
              Top Searched Specialties
            </h2>
            <Link href="/search" style={{
              color: "#3B6FE8", fontSize: 16, fontWeight: 700,
              textDecoration: "none", display: "flex", alignItems: "center", gap: 4,
            }}>
              See all <ChevronRight size={17} />
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {specialties.map((sp) => (
              <Link
                key={sp.name}
                href={`/search?specialty=${encodeURIComponent(sp.query)}`}
                className="specialty-card"
                style={{
                  background: "white", borderRadius: 24,
                  border: "1.5px solid #C7D9FF",
                  padding: "24px 16px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
                  textDecoration: "none", boxShadow: "0 2px 8px rgba(59,111,232,0.06)",
                }}
              >
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: "#EEF4FF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 38,
                }}>
                  {sp.icon}
                </div>
                <p style={{ color: "#1a1a2e", fontWeight: 800, fontSize: 17, textAlign: "center", margin: 0, lineHeight: 1.3 }}>
                  {sp.name}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* HEALTH TIP */}
        <div style={{
          background: "white", borderRadius: 24,
          border: "1.5px solid #C7D9FF",
          padding: "24px 28px",
          display: "flex", alignItems: "center", gap: 20,
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18, flexShrink: 0,
            background: "#EEF4FF", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 32,
          }}>
            💡
          </div>
          <div>
            <p style={{ color: "#1a1a2e", fontWeight: 800, fontSize: 18, margin: "0 0 5px" }}>Health Tip of the Day</p>
            <p style={{ color: "#6b7280", fontSize: 16, margin: 0, lineHeight: 1.5 }}>
              Drink at least 8 glasses of water daily and get 7–8 hours of sleep for optimal health.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <section className="w-full">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm border border-[#C7D9FF] text-[#3B6FE8]">
                <HelpCircle size={20} />
              </span>
              <div>
                <h3 className="text-[18px] sm:text-[20px] font-extrabold text-[#1a1a2e] leading-tight m-0">
                  Frequently Asked Questions
                </h3>
                <p className="text-[13px] sm:text-[14px] text-[#6b7280] m-0">
                  Quick answers about records, sharing, and appointments.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {faqItems.map((item, idx) => (
              <FaqAccordionItem
                key={item.q}
                item={item}
                isOpen={openFaqIndex === idx}
                onToggle={() => setOpenFaqIndex((cur) => (cur === idx ? null : idx))}
              />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}