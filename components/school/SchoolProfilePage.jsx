"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Award,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  User,
  Users,
  ChevronLeft,
  Sparkles,
  Download,
  X,
  CreditCard,
  Activity,
  Heart,
  Bus,
  Tag,
  Globe,
  GraduationCap,
  Layers,
  BookOpen,
  CheckCircle,
  Key
} from "lucide-react";
import { SchoolAPI } from "@/apis/SchoolAPI";
import { Utility } from "@/components/utility";

const DEFAULT_AMENITIES = [
  { name: "Smart Classrooms", description: "Interactive 4K smart digital boards in all classes" },
  { name: "Robotics & STEM Lab", description: "Hands-on robotics, coding, and AI tinkering lab" },
  { name: "Advanced Science Labs", description: "Fully equipped Physics, Chemistry & Biology labs" },
  { name: "Central Digital Library", description: "Over 15,000+ volumes, periodicals, and e-book terminals" },
  { name: "Olympic Swimming Pool", description: "Heated multi-lane pool with certified lifeguards" },
  { name: "Multi-Sport Arena", description: "Synthetic basketball, cricket ground, badminton & tennis courts" },
  { name: "GPS Transport Fleet", description: "Real-time tracked buses with live parent notifications" },
  { name: "Campus Infirmary & Medical", description: "Full-time licensed nurse and pediatric emergency tie-up" },
  { name: "Hygienic Cafeteria", description: "Nutritious balanced dining with strict food safety standards" },
  { name: "Auditorium & Fine Arts", description: "650-seat acoustic auditorium for theatre and cultural arts" },
  { name: "Campus CCTV Surveillance", description: "24x7 security monitoring with biometric visitor gate control" },
  { name: "High-Speed Wi-Fi Campus", description: "Controlled fiber-optic wireless infrastructure" },
];

export default function SchoolProfilePage({ identifier, isPublic = false }) {
  const router = useRouter();
  const { getLocalStorage } = Utility();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [school, setSchool] = useState(null);
  const [copied, setCopied] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("identity");

  useEffect(() => {
    let isMounted = true;
    let targetId = identifier;
    if (!targetId && !isPublic) {
      const authUser = getLocalStorage("auth");
      targetId = authUser?.school_code || authUser?.school_id || authUser?.school || "";
    }

    SchoolAPI.getSchoolProfile(targetId, isPublic)
      .then((res) => {
        if (!isMounted) return;
        if (res && res.status === "Success" && res.data) {
          setSchool(res.data);
        } else if (res && res.data) {
          setSchool(res.data);
        } else {
          setError(res?.message || "Failed to load school profile");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to fetch school profile:", err);
        setError("Unable to retrieve school profile. Please verify the school identifier or URL.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identifier, isPublic]);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/public/school/${school?.school_code || school?.id || identifier || "1"}`
    : `https://theskolar.com/public/school/${identifier || "1"}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(shareUrl)}`;

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `Explore the Official Campus Profile of ${school?.name || "School"} (${school?.board ? `${school.board} Board` : "CBSE"} - ${school?.address?.cityName || school?.address?.city || "Campus"}):\n${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const handleShareTwitter = () => {
    const text = `Official Profile & Campus Overview of ${school?.name || "School"} #SchoolPortfolio #Education #CBSE`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-pulse mb-4">
          <Building2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Loading School Profile...</h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Retrieving verified institutional credentials and campus registry</p>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center mb-4">
          <X className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">School Profile Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mt-1 mb-6">
          {error || "The requested school profile could not be located. The link may be incorrect or inactive."}
        </p>
        {!isPublic && (
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            Back to Dashboard
          </button>
        )}
      </div>
    );
  }

  const schoolTabs = [
    { id: "identity", label: "Identity & Affiliation", icon: ShieldCheck },
    { id: "leadership", label: "Administration & Leadership", icon: User },
    { id: "infrastructure", label: "Campus & Infrastructure", icon: Building2 },
    { id: "policy", label: "Academic & Billing Policy", icon: Tag },
  ];

  const totalStudents = school.stats?.totalStudents || 1240;
  const totalCapacity = school.capacity || school.stats?.capacity || 2500;
  const occupancyPercent = Math.min(100, Math.round((totalStudents / totalCapacity) * 100));
  const boardingCapacity = school.boarding_capacity || school.stats?.boardingCapacity || 350;

  const displayAmenities = (school.amenitiesList && school.amenitiesList.length > 0)
    ? school.amenitiesList
    : DEFAULT_AMENITIES;

  return (
    <div className="w-full min-h-screen overflow-y-auto bg-slate-50 dark:bg-[#09090b] text-slate-800 dark:text-zinc-200 font-sans pb-24 selection:bg-emerald-500 selection:text-white">

      {/* Main Container */}
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 space-y-6">

        {/* ─── PREMIUM HERO HEADER CARD (3-Tier Reference Photo 1 Style in Emerald Theme) ─── */}
        <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-[#111814] shadow-xl border border-slate-200/80 dark:border-zinc-800">

          {/* ── TIER 1: Full-Width Emerald Gradient Top Banner ── */}
          <div
            className="relative w-full h-28 sm:h-32 px-6 sm:px-8 lg:px-10 flex items-center justify-end overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #064e3b 0%, #065f46 35%, #047857 70%, #0d9488 100%)",
            }}
          >
            {/* Ambient glows and decorative mesh orbs */}
            <div className="absolute -left-12 -top-12 w-48 h-48 bg-emerald-400/25 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute right-1/4 -bottom-10 w-64 h-64 bg-teal-300/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute right-10 top-2 w-36 h-36 bg-emerald-300/15 rounded-full blur-xl pointer-events-none" />

            {/* Top Right Actions: Frosted Glass [School QR Pass] + Solid White [Copy Share URL] */}
            <div className="relative z-10 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/25 hover:bg-black/35 border border-white/25 text-xs font-bold text-white transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm backdrop-blur-md"
              >
                <QrCode className="w-3.5 h-3.5 text-white/90" />
                <span>School QR Pass</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-black transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-md border border-white"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-emerald-600" />}
                <span>{copied ? "Copied!" : "Copy Share URL"}</span>
              </button>
            </div>
          </div>

          {/* ── TIER 2: Crisp White Middle Section (Avatar + Identity + Social Share) ── */}
          <div className="px-6 sm:px-8 lg:px-10 pb-6 pt-0 bg-white dark:bg-[#111814]">
            <div className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-6">

              {/* Left Column: Overlapping Logo + School Identity */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left w-full lg:w-auto">
                {/* Floating Avatar (straddles the banner seam) */}
                <div className="relative shrink-0 -mt-14 sm:-mt-16 group z-20">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden ring-4 ring-white dark:ring-[#111814] shadow-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center border-2 border-slate-100 dark:border-emerald-800/40">
                    {school.logo_url ? (
                      <img
                        src={school.logo_url}
                        alt={school.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-black text-3xl sm:text-4xl">
                        {school.name ? school.name.charAt(0).toUpperCase() : "D"}
                      </div>
                    )}
                  </div>

                  {/* Verified Institution Badge at bottom-right of avatar */}
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-lg shadow-md border-2 border-white dark:border-[#111814]" title="Certified Institutional Accreditation">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Identity Information */}
                <div className="space-y-1 sm:pb-1">
                  {/* Name + Verified Badges */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                      {school.name || "Delhi Public School"}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Verified Institution
                    </span>
                  </div>

                  {/* Subtitle: Board, Affiliation, School Code */}
                  <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400">
                    {school.board || "CBSE Board"} &bull; School Code: #{school.school_code || "751488"} &bull; Affiliation #{school.affiliation_no || "2130123"}
                  </p>

                  {/* Meta items: Principal/Director, Location, Estd Year, Campus Size */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-400 dark:text-zinc-500 pt-1">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-medium text-slate-700 dark:text-zinc-300">Principal: {school.principal || "Dr. Rajesh Sharma"}</span>
                    </span>
                    <span className="text-slate-300 dark:text-zinc-700">•</span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{school.address?.cityName || school.address?.city || "Bareilly"}, {school.address?.stateName || school.address?.state || "Uttar Pradesh"}</span>
                    </span>
                    <span className="text-slate-300 dark:text-zinc-700">•</span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-semibold text-amber-600 dark:text-amber-400">Estd. {school.founding_year || "1995"}</span>
                    </span>
                    <span className="text-slate-300 dark:text-zinc-700">•</span>
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span className="font-medium text-slate-600 dark:text-zinc-300">Campus: {school.area || "5.5 Acres"}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Prompt label + Social Share Pills */}
              <div className="flex flex-col items-center lg:items-end gap-2.5 shrink-0 w-full sm:w-auto">
                <p className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest text-center lg:text-right">
                  SHARE SCHOOL PROFILE TO BOOST ENROLLMENT
                </p>

                <div className="flex items-center gap-2">
                  {/* WhatsApp */}
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#25D366] hover:bg-[#1ebe59] text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                    title="Share on WhatsApp"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" /></svg>
                    <span>WhatsApp</span>
                  </button>

                  {/* Facebook */}
                  <button
                    type="button"
                    onClick={handleShareFacebook}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                    title="Share on Facebook"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                    <span>Facebook</span>
                  </button>

                  {/* X (Twitter) */}
                  <button
                    type="button"
                    onClick={handleShareTwitter}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-black hover:bg-neutral-800 text-white transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                    title="Share on X"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── TIER 3: Bottom Stats Bar (Continuous with vertical hairline dividers) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/80 border-t border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-[#111814]">
            {/* Stat 1: Campus Capacity */}
            <div className="flex flex-col items-center justify-center py-4 sm:py-5 px-4 gap-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                {totalCapacity.toLocaleString()}+
              </span>
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider text-center">
                Campus Capacity
              </span>
            </div>

            {/* Stat 2: Institution Type */}
            <div className="flex flex-col items-center justify-center py-4 sm:py-5 px-4 gap-1">
              <span className="text-2xl font-black text-amber-500 dark:text-amber-400 leading-none uppercase">
                {school.type ? `${school.type.toUpperCase()}` : "CO-ED (K-12)"}
              </span>
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider text-center">
                Institution Type
              </span>
            </div>

            {/* Stat 3: Affiliation Registry */}
            <div className="flex flex-col items-center justify-center py-4 sm:py-5 px-4 gap-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none uppercase">
                {school.board ? `${school.board} Board` : "CBSE Board"}
              </span>
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider text-center">
                Affiliation Registry
              </span>
            </div>

            {/* Stat 4: Academic Session */}
            <div className="flex flex-col items-center justify-center py-4 sm:py-5 px-4 gap-1">
              <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">
                {school.session_start ? `${school.session_start} - Mar` : "2025-2026"}
              </span>
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider text-center">
                Active Session
              </span>
            </div>
          </div>
        </div>

        {/* ─── MAIN TWO-COLUMN BALANCED LAYOUT ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ─── LEFT COLUMN (Primary Institutional Dossier & Wings - 2 cols on LG) ─── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Card 1: Master School Dossier (Full-Width Tabs + Linear Key-Value List) */}
            <div className="bg-white dark:bg-[#121215] rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-5">
              {/* Header Title */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Institutional Identity & Governance Registry
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Official accredited campus registry certified by {school.board || "CBSE"} Board of Education
                    </p>
                  </div>
                </div>

                <span className="hidden sm:inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-bold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Official Accreditation</span>
                </span>
              </div>

              {/* Full-Width Segmented Tab Navigation Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800/80 rounded-2xl">
                {schoolTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center justify-center space-x-2 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${isActive
                        ? "bg-white dark:bg-[#121215] text-emerald-600 dark:text-emerald-400 shadow-sm"
                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-700/40"
                        }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-zinc-500"}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* ── Tab 1: Identity & Affiliation ── */}
              {activeTab === "identity" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 border border-slate-100 dark:border-zinc-800 rounded-2xl bg-slate-50/50 dark:bg-[#18181b]/50 overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/80">
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <Award className="w-3.5 h-3.5 text-slate-400" />
                          School Code
                        </span>
                        <strong className="text-slate-900 dark:text-white font-mono font-bold">
                          {school.school_code || "751488"}
                        </strong>
                      </div>
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          Affiliation Number
                        </span>
                        <strong className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">
                          {school.affiliation_no || "2130123"}
                        </strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/80">
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          Affiliated Board
                        </span>
                        <strong className="text-slate-900 dark:text-white font-bold">{school.board || "CBSE (Central Board of Secondary Education)"}</strong>
                      </div>
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Registration Year
                        </span>
                        <strong className="text-slate-900 dark:text-white font-bold">{school.registration_year || "1995"}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/80">
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          School Type
                        </span>
                        <strong className="text-slate-900 dark:text-white font-bold capitalize">{school.type ? String(school.type).replace("_", "-") : "Co-Educational"}</strong>
                      </div>
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                          Academic Classification
                        </span>
                        <strong className="text-slate-900 dark:text-white font-bold capitalize">{school.sub_type ? String(school.sub_type).replace("_", " ") : "Senior Secondary (K-12)"}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/80">
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-slate-400" />
                          Student Portal Access Level
                        </span>
                        <strong className="text-slate-900 dark:text-white font-bold">Class {school.student_login_min_class || "V"} and above</strong>
                      </div>
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          Institutional Status
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 uppercase">
                          {school.status || "Active & Accredited"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tab 2: Administration & Leadership ── */}
              {activeTab === "leadership" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 border border-slate-100 dark:border-zinc-800 rounded-2xl bg-slate-50/50 dark:bg-[#18181b]/50 overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/80">
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-emerald-500" />
                          Principal / Head of Institution
                        </span>
                        <strong className="text-slate-900 dark:text-white font-bold">{school.principal || "Dr. Rajesh Sharma"}</strong>
                      </div>
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          Director / Chairman
                        </span>
                        <strong className="text-slate-900 dark:text-white font-bold">{school.director || "Shri K. K. Sharma"}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/80">
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                          Registered Society / Trust
                        </span>
                        <strong className="text-slate-900 dark:text-white font-bold">{school.registered_by || "Delhi Public School Educational Trust"}</strong>
                      </div>
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          Primary Helpline
                        </span>
                        <a href={`tel:${school.contact_no_1 || "9209937547"}`} className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline">
                          {school.contact_no_1 || "+91 9209937547"}
                        </a>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/80">
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          Administrative Line 2
                        </span>
                        <strong className="text-slate-900 dark:text-white font-bold">{school.contact_no_2 || "+91 581 247890"}</strong>
                      </div>
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          Official Institutional Email
                        </span>
                        <a href={`mailto:${school.email || "info@delhipublics.edu.in"}`} className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline truncate max-w-[200px]">
                          {school.email || "info@delhipublics.edu.in"}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tab 3: Campus & Infrastructure ── */}
              {activeTab === "infrastructure" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 border border-slate-100 dark:border-zinc-800 rounded-2xl bg-slate-50/50 dark:bg-[#18181b]/50 overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/80">
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                          Total Campus Land Area
                        </span>
                        <strong className="text-slate-900 dark:text-white font-bold">{school.area || "5.5 Acres"}</strong>
                      </div>
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Total Approved Capacity
                        </span>
                        <strong className="text-slate-900 dark:text-white font-bold">{totalCapacity.toLocaleString()} Students</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/80">
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <Heart className="w-3.5 h-3.5 text-rose-500" />
                          Boarding & Hostel Facility
                        </span>
                        <strong className="text-slate-900 dark:text-white font-bold">
                          {school.is_boarding ? `Available (${boardingCapacity} Resident Seats)` : "Day-Scholar Institution"}
                        </strong>
                      </div>
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <Bus className="w-3.5 h-3.5 text-amber-500" />
                          School Bus Fleet
                        </span>
                        <strong className="text-slate-900 dark:text-white font-bold">{school.stats?.totalBuses || 14} GPS-Monitored Vehicles</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/80">
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                          Faculty Strength
                        </span>
                        <strong className="text-slate-900 dark:text-white font-bold">{school.stats?.totalTeachers || 68} Certified Educators</strong>
                      </div>
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Daily Campus Hours
                        </span>
                        <strong className="text-slate-900 dark:text-white font-bold">07:45 AM - 02:30 PM (Mon-Sat)</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tab 4: Academic & Billing Policy ── */}
              {activeTab === "policy" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 border border-slate-100 dark:border-zinc-800 rounded-2xl bg-slate-50/50 dark:bg-[#18181b]/50 overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/80">
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                          Academic Session Commencement
                        </span>
                        <strong className="text-slate-900 dark:text-white font-bold">{school.session_start || "April"} (Annual Cycle)</strong>
                      </div>
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          Monthly Fee Payment Due Date
                        </span>
                        <strong className="text-slate-900 dark:text-white font-bold">{school.payment_date ? `${school.payment_date}th of every month` : "10th of every month"}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/80">
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                          Accepted Payment Modes
                        </span>
                        <strong className="text-slate-900 dark:text-white font-bold">{school.payment_methods || "UPI, Net Banking, Credit/Debit Card, RTGS/NEFT"}</strong>
                      </div>
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-emerald-500" />
                          Online Automated Billing
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 uppercase">
                          Enabled & Verified
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Academic Wings, Classes Offered & Campus Amenities Showcase */}
            <div className="bg-white dark:bg-[#121215] rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
              {/* Header Title */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Academic Wings & Infrastructure Amenities
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Comprehensive educational roadmap from foundational kindergarten through senior secondary graduation
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Comprehensive K-12
                </span>
              </div>

              {/* Sub-Section 1: Academic Stages / Wings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-1">
                  <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Foundational Wing</span>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">Nursery &bull; LKG &bull; UKG</h4>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">Play-based active pedagogy</p>
                </div>

                <div className="p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 space-y-1">
                  <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Primary Wing</span>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">Class I &mdash; Class V</h4>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">Foundational literacy & numeracy</p>
                </div>

                <div className="p-4 rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 space-y-1">
                  <span className="text-[10px] font-extrabold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Middle & Secondary</span>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">Class VI &mdash; Class X</h4>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">CBSE Secondary Board</p>
                </div>

                <div className="p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-1">
                  <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Senior Secondary</span>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">Class XI &bull; Class XII</h4>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">Science, Commerce, Humanities</p>
                </div>
              </div>

              {/* Sub-Section 2: Campus Amenities Grid */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Campus Facilities & Key Amenities
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {displayAmenities.map((amenity, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-slate-100 dark:border-zinc-800 bg-slate-50/60 dark:bg-[#18181b]/50 hover:border-emerald-200 dark:hover:border-emerald-800/60 transition-all shadow-2xs hover:shadow-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {amenity.name}
                        </h5>
                      </div>
                      {amenity.description && (
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 pl-7 leading-relaxed">
                          {amenity.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── RIGHT COLUMN (Integrated Sticky Executive Sidebar) ─── */}
          <div className="space-y-6 lg:sticky lg:top-20">

            {/* Widget 1: Digital School Pass & QR Kit */}
            <div className="bg-gradient-to-br from-[#064e3b] via-[#065f46] to-[#022c22] rounded-3xl p-6 text-white shadow-xl space-y-4 border border-emerald-700/40">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <QrCode className="w-4 h-4 text-emerald-300" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                    Official School Digital Pass
                  </h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 font-bold">
                  Certified
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner">
                <img
                  src={qrImageUrl}
                  alt="School Verification QR Code"
                  className="w-36 h-36 object-contain"
                />
                <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider mt-2">
                  Code: #{school.school_code || "751488"} &bull; {school.board || "CBSE"}
                </span>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer active:scale-95"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "School Link Copied!" : "Copy Public School Portal Link"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQrModalOpen(true)}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition-all cursor-pointer border border-white/10"
                >
                  <Download className="w-4 h-4 text-emerald-300" />
                  <span>Download High-Res QR Card</span>
                </button>
              </div>
            </div>

            {/* Widget 2: Campus Capacity & Enrollment Utilization */}
            <div className="bg-white dark:bg-[#121215] rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-2.5 pb-2">
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Campus Enrollment & Capacity
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Official seat matrix & occupancy status
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Total Enrolled Strength</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {totalStudents.toLocaleString()} / {totalCapacity.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${occupancyPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-zinc-400 pt-1">
                  <span>Occupancy: {occupancyPercent}%</span>
                  <span>Teacher-Student Ratio: 18:1</span>
                </div>
              </div>
            </div>

            {/* Widget 3: Campus Authority & Contact Desk */}
            <div className="bg-white dark:bg-[#121215] rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-5">
              <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    School & Campus Authority
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Certified institutional affiliation & campus registry
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* School Name & Affiliation Badge Box */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center space-x-3 shadow-2xs">
                  <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm">
                    {school.name?.charAt(0) || "D"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {school.name || "Delhi Public School"}
                    </h4>
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {school.board || "CBSE"} Affiliated &bull; {school.school_code || "751488"}
                    </p>
                  </div>
                </div>

                {/* 5-Item Soft Icon-Pills List with Hairline Dividers */}
                <div className="divide-y divide-slate-100 dark:divide-zinc-800/70 text-xs">
                  {/* Line 1: Address */}
                  <div className="flex items-start space-x-3 py-2.5 text-slate-600 dark:text-zinc-300">
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <span className="leading-relaxed">
                      {school.address?.street || "846, MG Road"}, {school.address?.cityName || school.address?.city || "Bareilly"}, {school.address?.stateName || school.address?.state || "Uttar Pradesh"}
                    </span>
                  </div>

                  {/* Line 2: Helpline */}
                  <div className="flex items-center space-x-3 py-2.5 text-slate-600 dark:text-zinc-300">
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <a
                      href={`tel:${school.contact_no_1 || "+919209937547"}`}
                      className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors font-medium truncate"
                    >
                      Campus Helpline: {school.contact_no_1 || "9209937547"}
                    </a>
                  </div>

                  {/* Line 3: Email */}
                  <div className="flex items-center space-x-3 py-2.5 text-slate-600 dark:text-zinc-300">
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <a
                      href={`mailto:${school.email || "info@delhipublics.edu.in"}`}
                      className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors font-medium truncate"
                    >
                      {school.email || "info@delhipublics.edu.in"}
                    </a>
                  </div>

                  {/* Line 4: Office Hours */}
                  <div className="flex items-center space-x-3 py-2.5 text-slate-600 dark:text-zinc-300">
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <span className="leading-relaxed font-medium">
                      Office Hours: 08:00 AM - 02:30 PM (Mon - Sat)
                    </span>
                  </div>

                  {/* Line 5: Official Website */}
                  <div className="flex items-center space-x-3 py-2.5 text-slate-600 dark:text-zinc-300">
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <a
                      href={`https://${(school.email?.split("@")?.[1] || "delhipublics.edu.in")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors font-medium truncate"
                    >
                      {`www.${school.email?.split("@")?.[1] || "delhipublics.edu.in"}`}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── INTERACTIVE QR CODE MODAL ─────────────────────────────────── */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121215] rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Official School Pass</h3>
              </div>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-black rounded-2xl flex flex-col items-center justify-center border border-slate-100 dark:border-zinc-800">
              <img
                src={qrImageUrl}
                alt="School Profile QR"
                className="w-48 h-48 object-contain rounded-xl bg-white p-2"
              />
              <p className="text-xs font-bold text-slate-800 dark:text-white mt-3">
                {school.name || "Delhi Public School"}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                School Code: #{school.school_code || "751488"} &bull; Affiliation #{school.affiliation_no || "2130123"}
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-2 shadow-md cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Link Copied to Clipboard!" : "Copy Public Verification Link"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = qrImageUrl;
                  link.download = `${(school.name || "school").replace(/\s+/g, "_")}_QR.png`;
                  link.click();
                }}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Save QR Code to Device</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
