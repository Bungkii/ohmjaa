"use client";

import React, { useState, useTransition, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Flame,
  AlertTriangle,
  Leaf,
  PlusCircle,
  FileSpreadsheet,
  Trash2,
  Search,
  ExternalLink,
  Gavel,
  History,
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity,
  UserCheck,
  Calendar,
  Layers,
  Sparkles,
  Command,
  ChevronRight,
  Filter,
  Check,
  Settings,
  HelpCircle,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { Student, PenaltyRecord, SeverityLevel } from "@/types/penalty";
import { createPenaltyRecord, deletePenaltyRecord } from "@/app/actions";

interface DisciplinaryAppProps {
  initialStudents: Student[];
  initialRecords: PenaltyRecord[];
}

const severityConfig: Record<
  SeverityLevel,
  {
    title: string;
    punishment: string;
    icon: React.ElementType;
    color: string;
    badgeBg: string;
    badgeText: string;
    border: string;
    activeBorder: string;
    activeBg: string;
  }
> = {
  low: {
    title: "รุนแรงน้อย",
    punishment: "ทำเวร 1 วัน",
    icon: Leaf,
    color: "text-emerald-500",
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badgeText: "text-emerald-600",
    border: "border-slate-200 hover:border-emerald-300",
    activeBorder: "border-emerald-500 ring-2 ring-emerald-500/20",
    activeBg: "bg-emerald-50/70",
  },
  medium: {
    title: "รุนแรงกลาง",
    punishment: "ทำเวร 1 อาทิตย์",
    icon: AlertTriangle,
    color: "text-amber-500",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
    badgeText: "text-amber-600",
    border: "border-slate-200 hover:border-amber-300",
    activeBorder: "border-amber-500 ring-2 ring-amber-500/20",
    activeBg: "bg-amber-50/70",
  },
  high: {
    title: "รุนแรงมาก",
    punishment: "ทำเวร 1 เดือน",
    icon: Flame,
    color: "text-rose-500",
    badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
    badgeText: "text-rose-600",
    border: "border-slate-200 hover:border-rose-300",
    activeBorder: "border-rose-500 ring-2 ring-rose-500/20",
    activeBg: "bg-rose-50/70",
  },
  strict: {
    title: "ปกครอง",
    punishment: "ให้ใบปกครอง",
    icon: ShieldAlert,
    color: "text-purple-600",
    badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
    badgeText: "text-purple-600",
    border: "border-slate-200 hover:border-purple-300",
    activeBorder: "border-purple-600 ring-2 ring-purple-600/20",
    activeBg: "bg-purple-50/70",
  },
};

export default function DisciplinaryApp({
  initialStudents,
  initialRecords,
}: DisciplinaryAppProps) {
  const [students] = useState<Student[]>(initialStudents);
  const [records, setRecords] = useState<PenaltyRecord[]>(initialRecords);

  // Form states
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchStudent, setSearchStudent] = useState("");
  const [incidentText, setIncidentText] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel>("medium");

  // Filter & Search Table
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<string>("all");

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "form" | "history">("overview");

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    if (!searchStudent.trim()) return students;
    const q = searchStudent.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.student_id.includes(q) ||
        s.student_no.toString() === q ||
        (s.nickname && s.nickname.toLowerCase().includes(q))
    );
  }, [students, searchStudent]);

  // Analytics Metrics (Nuxt Dashboard KPI Card Style)
  const metrics = useMemo(() => {
    const total = records.length;
    const severeCount = records.filter(
      (r) => r.severity === "high" || r.severity === "strict"
    ).length;
    const studentsWithPenalty = new Set(records.map((r) => r.student_id)).size;
    const cleanStudents = Math.max(0, students.length - studentsWithPenalty);

    // Distribution
    const counts = { low: 0, medium: 0, high: 0, strict: 0 };
    records.forEach((r) => {
      if (counts[r.severity] !== undefined) counts[r.severity]++;
    });

    return { total, severeCount, studentsWithPenalty, cleanStudents, counts };
  }, [records, students]);

  // Filtered History Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        !historySearch ||
        r.student_name.toLowerCase().includes(historySearch.toLowerCase()) ||
        r.student_id.includes(historySearch) ||
        r.incident.toLowerCase().includes(historySearch.toLowerCase()) ||
        (r.student_nickname &&
          r.student_nickname.toLowerCase().includes(historySearch.toLowerCase()));

      const matchFilter =
        historyFilter === "all" || r.severity === historyFilter;

      return matchSearch && matchFilter;
    });
  }, [records, historySearch, historyFilter]);

  // Save Record Action
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      showToast("กรุณาเลือกลูกศิษย์ก่อนบันทึก!");
      return;
    }
    if (!incidentText.trim()) {
      showToast("กรุณาระบุสาเหตุหรือพฤติกรรม!");
      return;
    }

    const rule = severityConfig[selectedSeverity];

    startTransition(async () => {
      const created = await createPenaltyRecord({
        student_id: selectedStudent.student_id,
        student_no: selectedStudent.student_no,
        student_name: `${selectedStudent.prefix}${selectedStudent.first_name} ${selectedStudent.last_name}`,
        student_nickname: selectedStudent.nickname,
        severity: selectedSeverity,
        severity_title: rule.title,
        incident: incidentText.trim(),
        punishment: rule.punishment,
        status: "pending",
      });

      setRecords((prev) => [created, ...prev]);
      setIncidentText("");
      showToast(`บันทึกบทลงโทษ ${selectedStudent.first_name} สำเร็จแล้ว ✨`);
    });
  };

  // Delete Record Action
  const handleDelete = (id: string, name: string) => {
    if (!confirm(`ต้องการลบรายการของ ${name} ใช่หรือไม่?`)) return;
    startTransition(async () => {
      await deletePenaltyRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      showToast("ลบรายการประวัติแล้ว");
    });
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (records.length === 0) {
      showToast("ยังไม่มีข้อมูลสำหรับส่งออก");
      return;
    }

    const data = records.map((r, i) => ({
      ลำดับ: i + 1,
      รหัสนักเรียน: r.student_id,
      เลขที่: r.student_no,
      ชื่อ_นามสกุล: r.student_name,
      ชื่อเล่น: r.student_nickname || "-",
      ระดับความรุนแรง: r.severity_title,
      สาเหตุ: r.incident,
      บทลงโทษ: r.punishment,
      วันที่บันทึก: new Date(r.created_at).toLocaleString("th-TH"),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Disciplinary");
    XLSX.writeFile(wb, `ohmjaa_penalties_${new Date().toISOString().split("T")[0]}.xlsx`);
    showToast("ส่งออกไฟล์ Excel สำเร็จแล้ว 📊");
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      {/* Toast Notification (Nuxt UI Toast style) */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-slate-900 text-white px-4 py-3 text-sm shadow-xl border border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SIDEBAR (Nuxt Dashboard UDashboardSidebar style) */}
      {/* ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200/80 bg-white flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-xs">
              <Gavel className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
                โอมจ๋า <span className="text-[10px] bg-rose-50 text-rose-600 font-semibold px-2 py-0.5 rounded-full border border-rose-100">ม.2/3</span>
              </div>
              <div className="text-[11px] text-slate-400">Disciplinary Console</div>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            ระบบจัดการ
          </div>

          <button
            onClick={() => {
              setActiveTab("overview");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "overview"
                ? "bg-slate-100 text-slate-900"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className={`h-4 w-4 ${activeTab === "overview" ? "text-rose-500" : "text-slate-400"}`} />
              <span>ภาพรวม & บันทึกบทลงโทษ</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/60 font-mono text-slate-600">
              {records.length}
            </span>
          </button>

          <a
            href="https://primjaa.bungkii.app"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Layers className="h-4 w-4 text-slate-400" />
              <span>พริมจ๋า (Kanbann ม.2/3)</span>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
          </a>

          <div className="pt-4 px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            ฐานข้อมูล & สถิติ
          </div>

          <div className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400" /> นักเรียนทั้งหมด
              </span>
              <span className="font-semibold text-slate-700 font-mono">{students.length} คน</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-purple-500" /> ห้องปกครอง
              </span>
              <span className="font-semibold text-purple-600 font-mono">{metrics.counts.strict} เคส</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-rose-500" /> รุนแรงมาก
              </span>
              <span className="font-semibold text-rose-600 font-mono">{metrics.counts.high} เคส</span>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
              ครู
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-800 truncate">ครูผู้ดูแลห้อง ม.2/3</div>
              <div className="text-[11px] text-slate-400 truncate">โอมจ๋า Discipline System</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN WRAPPER (Nuxt Dashboard Content Area) */}
      {/* ========================================================================= */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        
        {/* TOP NAVBAR (UDashboardNavbar style) */}
        <header className="sticky top-0 z-30 h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">แดชบอร์ดบทลงโทษ</span>
              <span className="text-slate-300">/</span>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">ห้องเรียน ม.2/3</span>
            </div>
          </div>

          {/* Quick Actions in Navbar */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ส่งออก</span> Excel
            </button>
            <a
              href="https://primjaa.bungkii.app"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">พริมจ๋า</span>
            </a>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* PAGE BODY */}
        {/* ========================================================================= */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* 1. NUXT CHARTS / METRICS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Metric 1 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">บันทึกบทลงโทษรวม</span>
                <div className="p-2 rounded-xl bg-rose-50 text-rose-500">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-slate-800 font-mono">
                {metrics.total} <span className="text-xs font-normal text-slate-400 font-sans">ครั้ง</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3 text-slate-400" /> บันทึกตลอดภาคเรียน
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">ลูกศิษย์ที่มีประวัติ</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-slate-800 font-mono">
                {metrics.studentsWithPenalty} <span className="text-xs font-normal text-slate-400 font-sans">คน</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                คิดเป็น {Math.round((metrics.studentsWithPenalty / (students.length || 1)) * 100)}% ของห้อง ม.2/3
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">ส่งฝ่ายปกครอง</span>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <ShieldAlert className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-purple-700 font-mono">
                {metrics.counts.strict} <span className="text-xs font-normal text-slate-400 font-sans">เคส</span>
              </div>
              <div className="text-[11px] text-purple-600/80 mt-1">
                ความผิดระดับสูงสุดของโรงเรียน
              </div>
            </div>

            {/* Metric 4 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">นักเรียนวินัยดีเยี่ยม</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <UserCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-emerald-700 font-mono">
                {metrics.cleanStudents} <span className="text-xs font-normal text-slate-400 font-sans">คน</span>
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                ไม่มีประวัติการโดนทำโทษ
              </div>
            </div>

          </div>

          {/* 2. MAIN WORKSPACE (Nuxt UI Grid Section) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left 7 Cols: Disciplinary Input Engine */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Form Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
                
                {/* Step 1: Select Student */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100">
                      1
                    </span>
                    <h2 className="text-sm font-bold text-slate-800">เลือกลูกศิษย์ ม.2/3</h2>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full border ${
                      selectedStudent
                        ? "bg-rose-50 text-rose-700 border-rose-200 font-semibold"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {selectedStudent
                      ? `เลขที่ ${selectedStudent.student_no} - ${selectedStudent.first_name}`
                      : "ยังไม่ได้เลือก"}
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative mb-3">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    placeholder="ค้นหาตามชื่อ, นามสกุล หรือ เลขประจำตัว..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Student Scroll List */}
                <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1.5 pr-1 mb-6">
                  {filteredStudents.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      ไม่พบข้อมูลนักเรียนที่ตรงกับคำค้นหา
                    </div>
                  ) : (
                    filteredStudents.map((st) => {
                      const isSelected = selectedStudent?.student_id === st.student_id;
                      return (
                        <button
                          key={st.student_id}
                          type="button"
                          onClick={() => setSelectedStudent(st)}
                          className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/10"
                              : "bg-white hover:bg-slate-50/80 border-slate-200/80"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                isSelected
                                  ? "bg-rose-500 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {st.student_no}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-800">
                                {st.prefix}
                                {st.first_name} {st.last_name}
                                {st.nickname && (
                                  <span className="text-rose-600 ml-1 font-normal">
                                    ({st.nickname})
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                รหัสนักเรียน: {st.student_id}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-rose-600 stroke-[3]" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Step 2: Severity & Reason */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100">
                      2
                    </span>
                    <h2 className="text-sm font-bold text-slate-800">
                      ระบุพฤติกรรมและระดับความผิด
                    </h2>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        สาเหตุ / รายละเอียดพฤติกรรม
                      </label>
                      <input
                        type="text"
                        value={incidentText}
                        onChange={(e) => setIncidentText(e.target.value)}
                        placeholder="เช่น มาสาย, ไม่ส่งการบ้านวิชาคณิต, ส่งเสียงดังในห้อง"
                        className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2">
                        ระดับความรุนแรง
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(["low", "medium", "high", "strict"] as SeverityLevel[]).map((key) => {
                          const item = severityConfig[key];
                          const IconComp = item.icon;
                          const isActive = selectedSeverity === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setSelectedSeverity(key)}
                              className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                                isActive
                                  ? `${item.activeBorder} ${item.activeBg}`
                                  : `${item.border} bg-white hover:bg-slate-50`
                              }`}
                            >
                              <IconComp className={`h-4 w-4 ${item.color} mb-1`} />
                              <span className="text-xs font-bold text-slate-700">{item.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Auto Punishment Banner */}
                    <div className="p-4 rounded-xl border border-rose-100 bg-gradient-to-r from-rose-50/80 via-amber-50/50 to-white flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-white shadow-xs border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                        <Gavel className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 font-medium">บทลงโทษที่ได้รับอัตโนมัติ</div>
                        <div className="text-sm font-bold text-slate-800">
                          {severityConfig[selectedSeverity].punishment}
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isPending || !selectedStudent}
                      className="w-full py-3 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span>{isPending ? "กำลังบันทึก..." : "บันทึกบทลงโทษเข้าสู่ระบบ"}</span>
                    </button>
                  </form>
                </div>

              </div>
            </div>

            {/* Right 5 Cols: Data Table & History */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
                
                {/* Table Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-800">ประวัติบันทึกบทลงโทษ</h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {filteredRecords.length} รายการ
                  </span>
                </div>

                {/* Search & Filter within Table */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="ค้นประวัติ..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <select
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none"
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="low">รุนแรงน้อย</option>
                    <option value="medium">รุนแรงกลาง</option>
                    <option value="high">รุนแรงมาก</option>
                    <option value="strict">ปกครอง</option>
                  </select>
                </div>

                {/* History Cards */}
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                  {filteredRecords.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                      <Clock className="h-8 w-8 text-slate-300 mb-2" />
                      ไม่มีประวัติการลงโทษในเกณฑ์นี้
                    </div>
                  ) : (
                    filteredRecords.map((rec) => {
                      const cfg = severityConfig[rec.severity] || severityConfig.medium;
                      return (
                        <div
                          key={rec.id}
                          className="p-3.5 rounded-xl border border-slate-200/70 bg-white hover:border-slate-300 transition-all space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-xs font-bold text-slate-800">
                                เลขที่ {rec.student_no} {rec.student_name}
                                {rec.student_nickname && (
                                  <span className="text-rose-500 font-normal ml-1">
                                    ({rec.student_nickname})
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                ID: {rec.student_id}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.badgeBg}`}
                            >
                              {rec.severity_title}
                            </span>
                          </div>

                          <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 text-xs">
                            <div className="font-semibold text-slate-700 flex items-center gap-1.5 mb-0.5">
                              <Gavel className="h-3 w-3 text-rose-500" />
                              <span>
                                บทลงโทษ: <span className={cfg.badgeText}>{rec.punishment}</span>
                              </span>
                            </div>
                            <div className="text-slate-500 text-[11px]">
                              <span className="font-medium text-slate-600">สาเหตุ:</span>{" "}
                              {rec.incident}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(rec.created_at).toLocaleString("th-TH")}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(rec.id, rec.student_name)}
                              className="text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>ลบ</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
