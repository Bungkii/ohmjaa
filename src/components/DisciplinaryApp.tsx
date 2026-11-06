"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  Trophy,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  BookOpen,
  Filter,
  Check,
  ChevronDown,
  LayoutDashboard,
  Calendar,
  Layers,
  ArrowRight,
  X,
  Gavel,
  ShieldAlert,
  Flame,
  AlertTriangle,
  Leaf,
  PlusCircle,
  FileText,
  Trash2,
  Send,
  ExternalLink,
  UserCheck,
  CalendarDays,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { startOfDay, isBefore, isToday, isTomorrow, differenceInDays } from "date-fns";
import { Student, PenaltyRecord, SeverityLevel, HomeworkTask, TaskCompletion } from "@/types/penalty";
import { createPenaltyRecord, deletePenaltyRecord } from "@/app/actions";

interface DisciplinaryAppProps {
  initialStudents: Student[];
  initialRecords: PenaltyRecord[];
  initialTasks: HomeworkTask[];
  initialCompletions: TaskCompletion[];
}

export function formatStudentFullName(student: Student): string {
  const prefix = student.prefix === "ด.ญ." ? "เด็กหญิง" : student.prefix === "ด.ช." ? "เด็กชาย" : student.prefix;
  return `${prefix}${student.first_name} ${student.last_name}`;
}

export function getStudentAvatar(student: Student): string {
  return student.prefix === "ด.ญ." ? "/asset/student-girl.webp" : "/asset/student-boy.webp";
}

export function getUrgency(task: HomeworkTask) {
  if (task.status === "done") return null;
  const due = startOfDay(new Date(task.due_date));
  const today = startOfDay(new Date());

  if (isBefore(due, today) || isToday(due)) {
    return { level: "critical", text: "เกินกำหนดแล้ว!", color: "text-red-700 bg-red-100 border-red-200" };
  } else if (isTomorrow(due) || differenceInDays(due, today) <= 2) {
    return { level: "warning", text: "ใกล้ถึงกำหนด", color: "text-amber-700 bg-amber-100 border-amber-200" };
  } else {
    return { level: "chill", text: "ยังมีเวลา", color: "text-emerald-700 bg-emerald-100 border-emerald-200" };
  }
}

const severityConfig: Record<
  SeverityLevel,
  {
    title: string;
    punishment: string;
    icon: React.ElementType;
    color: string;
    badgeBg: string;
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
    border: "border-slate-200 hover:border-rose-300",
    activeBorder: "border-rose-500 ring-2 ring-rose-500/20",
    activeBg: "bg-rose-50/70",
  },
  strict: {
    title: "ปกครอง",
    punishment: "ให้ใบปกครอง & เชิญผู้ปกครอง",
    icon: ShieldAlert,
    color: "text-purple-600",
    badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
    border: "border-slate-200 hover:border-purple-300",
    activeBorder: "border-purple-600 ring-2 ring-purple-600/20",
    activeBg: "bg-purple-50/70",
  },
};

export default function DisciplinaryApp({
  initialStudents,
  initialRecords,
  initialTasks,
  initialCompletions,
}: DisciplinaryAppProps) {
  const [students] = useState<Student[]>(initialStudents);
  const [records, setRecords] = useState<PenaltyRecord[]>(initialRecords);
  const [tasks] = useState<HomeworkTask[]>(initialTasks);
  const [completions] = useState<TaskCompletion[]>(initialCompletions);

  // Active view: "assignments" | "disciplinary" | "history"
  const [activeView, setActiveView] = useState<"assignments" | "disciplinary" | "history">("assignments");

  // Selected Student for Persistent Tracking (Kanbann Parent Style)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchStudentInput, setSearchStudentInput] = useState("");

  // Homework View Filters
  const [viewMode, setViewMode] = useState<"board" | "list" | "category">("board");
  const [childFilter, setChildFilter] = useState<"all" | "pending" | "done">("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<HomeworkTask | null>(null);

  // Disciplinary form
  const [penaltyStudent, setPenaltyStudent] = useState<Student | null>(null);
  const [penaltySearch, setPenaltySearch] = useState("");
  const [incidentText, setIncidentText] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History search
  const [historySearch, setHistorySearch] = useState("");

  // Map student completion
  const completionMap = useMemo(() => {
    const map = new Map<string, string>();
    completions.forEach((c) => {
      map.set(`${c.student_id}_${c.task_id}`, c.status);
    });
    return map;
  }, [completions]);

  // Tasks with student-specific status applied
  const studentActiveTasks = useMemo(() => {
    return tasks.map((t) => {
      if (!selectedStudent) return t;
      const status = completionMap.get(`${selectedStudent.student_id}_${t.id}`);
      return status ? { ...t, status } : t;
    });
  }, [tasks, selectedStudent, completionMap]);

  // Filtered tasks by subject and childFilter
  const filteredTasks = useMemo(() => {
    let result = studentActiveTasks;
    if (filterSubject !== "all") {
      result = result.filter((t) => t.subject === filterSubject);
    }
    if (selectedStudent && childFilter === "pending") {
      result = result.filter((t) => t.status !== "done");
    } else if (selectedStudent && childFilter === "done") {
      result = result.filter((t) => t.status === "done");
    }
    return result;
  }, [studentActiveTasks, filterSubject, selectedStudent, childFilter]);

  // Unique subjects for filters
  const uniqueSubjects = useMemo(() => {
    const subs = Array.from(new Set(tasks.map((t) => t.subject)));
    return subs.sort();
  }, [tasks]);

  // Stats for the selected student
  const studentStats = useMemo(() => {
    const total = tasks.length;
    let done = 0;
    let pending = 0;
    studentActiveTasks.forEach((t) => {
      if (t.status === "done") done++;
      else pending++;
    });
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, pending, progress };
  }, [tasks, studentActiveTasks]);

  // Student search modal results
  const modalStudentResults = useMemo(() => {
    const q = searchStudentInput.trim().toLowerCase();
    if (!q) return students.slice(0, 10);
    return students.filter(
      (s) =>
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.student_id.includes(q) ||
        s.student_no.toString() === q ||
        (s.nickname && s.nickname.toLowerCase().includes(q))
    );
  }, [students, searchStudentInput]);

  // Disciplinary student filter
  const penaltyStudentResults = useMemo(() => {
    const q = penaltySearch.trim().toLowerCase();
    if (!q) return students.slice(0, 12);
    return students.filter(
      (s) =>
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.student_id.includes(q) ||
        s.student_no.toString() === q ||
        (s.nickname && s.nickname.toLowerCase().includes(q))
    );
  }, [students, penaltySearch]);

  // Handle Penalty Submit
  const handlePenaltySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!penaltyStudent) {
      toast.error("กรุณาเลือกลูกศิษย์ก่อนบันทึก!");
      return;
    }
    if (!incidentText.trim()) {
      toast.error("กรุณาระบุพฤติกรรมหรือสาเหตุ!");
      return;
    }

    setIsSubmitting(true);
    const rule = severityConfig[selectedSeverity];
    try {
      const created = await createPenaltyRecord({
        student_id: penaltyStudent.student_id,
        student_no: penaltyStudent.student_no,
        student_name: `${penaltyStudent.prefix}${penaltyStudent.first_name} ${penaltyStudent.last_name}`,
        student_nickname: penaltyStudent.nickname,
        severity: selectedSeverity,
        severity_title: rule.title,
        incident: incidentText.trim(),
        punishment: rule.punishment,
        status: "pending",
      });

      setRecords((prev) => [created, ...prev]);
      setIncidentText("");
      toast.success(`บันทึกบทลงโทษ ${penaltyStudent.first_name} สำเร็จ! ✨`);
    } catch (err) {
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Record
  const handleDeleteRecord = async (id: string, name: string) => {
    if (!confirm(`ต้องการลบรายการของ ${name} ใช่หรือไม่?`)) return;
    try {
      await deletePenaltyRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success("ลบรายการประวัติแล้ว");
    } catch {
      toast.error("ไม่สามารถลบรายการได้");
    }
  };

  // Export to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (records.length === 0) {
      toast.error("ยังไม่มีข้อมูลสำหรับส่งออก CSV");
      return;
    }

    const headers = ["ลำดับ", "รหัสนักเรียน", "เลขที่", "ชื่อ-สกุล", "ชื่อเล่น", "ระดับความรุนแรง", "สาเหตุ", "บทลงโทษ", "วันที่บันทึก"];
    const rows = records.map((r, i) => [
      `"${i + 1}"`,
      `"${r.student_id}"`,
      `"${r.student_no}"`,
      `"${r.student_name.replace(/"/g, '""')}"`,
      `"${(r.student_nickname || "-").replace(/"/g, '""')}"`,
      `"${r.severity_title}"`,
      `"${r.incident.replace(/"/g, '""')}"`,
      `"${r.punishment.replace(/"/g, '""')}"`,
      `"${new Date(r.created_at).toLocaleString("th-TH")}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ohmjaa_penalties_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("ส่งออกไฟล์ CSV สำเร็จแล้ว 📄");
  };

  // Kanban columns definition
  const columns = [
    { id: "todo", title: "ต้องทำ (Todo)", tasks: filteredTasks.filter((t) => t.status === "todo") },
    { id: "in_progress", title: "กำลังทำ (In Progress)", tasks: filteredTasks.filter((t) => t.status === "in_progress") },
    { id: "done", title: "เสร็จแล้ว (Done)", tasks: filteredTasks.filter((t) => t.status === "done") },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24 selection:bg-rose-100 selection:text-rose-800">
      <Toaster position="bottom-right" />

      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR (Kanbann & Primjaa Floating Pill Style)                     */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/70 px-4 sm:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/20 shrink-0">
              <Gavel size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-extrabold text-base sm:text-lg text-slate-800 tracking-tight">
                <span>โอมจ๋า</span>
                <span className="text-[10px] bg-rose-50 text-rose-600 font-bold px-2 py-0.5 rounded-full border border-rose-200">
                  ม.2/3
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                ระบบจัดการวินัย & ตรวจสอบการบ้านห้อง ม.2/3
              </p>
            </div>
          </div>

          {/* Desktop Nav Pills */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-full border border-slate-200/60 text-xs font-semibold">
            <button
              onClick={() => setActiveView("assignments")}
              className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
                activeView === "assignments"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              กระดานการบ้าน
            </button>
            <button
              onClick={() => setActiveView("disciplinary")}
              className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
                activeView === "disciplinary"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              บันทึกบทลงโทษ
            </button>
            <button
              onClick={() => setActiveView("history")}
              className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
                activeView === "history"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              ประวัติ ({records.length})
            </button>
          </nav>

          {/* Actions on Navbar Right */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-full shadow-2xs transition-all cursor-pointer"
              title="ส่งออกประวัติเป็นไฟล์ CSV"
            >
              <FileText size={14} className="text-slate-500" />
              <span className="hidden sm:inline">ส่งออก</span> CSV
            </button>

            <a
              href="https://primjaa.bungkii.app"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-full shadow-sm transition-all"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>พริมจ๋า ม.2/3</span>
              <ExternalLink size={12} className="opacity-60" />
            </a>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTAINER                                                         */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">

        {/* ------------------------------------------------------------------------- */}
        {/* STUDENT IDENTIFICATION BANNER (Kanbann Parent Banner)                     */}
        {/* ------------------------------------------------------------------------- */}
        {selectedStudent ? (
          <div className="rounded-3xl p-4 sm:p-5 bg-white border border-rose-100 shadow-[0_4px_24px_rgba(244,63,94,0.06)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-center shrink-0 p-2 overflow-hidden">
                <img
                  src={getStudentAvatar(selectedStudent)}
                  alt={selectedStudent.first_name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-800 truncate">
                    {formatStudentFullName(selectedStudent)}
                  </h3>
                  {selectedStudent.nickname && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                      น้อง{selectedStudent.nickname}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-slate-400 font-mono">
                    เลขที่ {selectedStudent.student_no}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  รหัสนักเรียน: <span className="font-mono">{selectedStudent.student_id}</span> • ห้อง ม.2/3
                </p>
              </div>
            </div>

            {/* Quick Metrics of this Student */}
            <div className="flex items-center gap-3 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">ส่งการบ้านแล้ว:</span>
                <span className="font-extrabold text-slate-800 font-mono text-sm">
                  {studentStats.done}/{studentStats.total}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold font-mono text-xs border border-emerald-200">
                  {studentStats.progress}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  เปลี่ยนคน
                </button>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-full transition-colors cursor-pointer"
                  title="ยกเลิกการเลือก"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Prompt banner when no student is selected */
          <div className="rounded-3xl p-5 bg-gradient-to-r from-rose-50 via-pink-50 to-white border border-pink-200/70 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
                <Users size={22} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
                  ต้องการตรวจดูงานและบทลงโทษของนักเรียนคนไหน?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  แตะเพื่อค้นหาชื่อหรือเลขที่ เพื่อดูรายการการบ้านที่ยังค้างส่งและความคืบหน้าแบบเรียลไทม์
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="px-5 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-extrabold shadow-md shadow-rose-500/20 transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Search size={14} />
              <span>เลือกลูกศิษย์ / นักเรียน</span>
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* VIEW 1: KANBANN HOMEWORK ASSIGNMENTS BOARD                                */}
        {/* ------------------------------------------------------------------------- */}
        {activeView === "assignments" && (
          <div className="space-y-6">
            
            {/* Toolbar: Views & Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
              
              {/* Subject filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setFilterSubject("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterSubject === "all"
                      ? "bg-rose-500 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  ทุกวิชา ({tasks.length})
                </button>
                {uniqueSubjects.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setFilterSubject(sub)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      filterSubject === sub
                        ? "bg-rose-500 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              {/* Status Filter when student is chosen */}
              {selectedStudent && (
                <div className="flex items-center gap-1.5 shrink-0 text-xs bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setChildFilter("all")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      childFilter === "all" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-600"
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    onClick={() => setChildFilter("pending")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      childFilter === "pending" ? "bg-rose-500 text-white shadow-2xs" : "text-rose-600"
                    }`}
                  >
                    ยังไม่ส่ง ({studentStats.pending})
                  </button>
                  <button
                    onClick={() => setChildFilter("done")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      childFilter === "done" ? "bg-emerald-600 text-white shadow-2xs" : "text-emerald-700"
                    }`}
                  >
                    ส่งแล้ว ({studentStats.done})
                  </button>
                </div>
              )}

            </div>

            {/* Kanban Columns (Kanbann Style) */}
            <div className="overflow-x-auto w-full pb-6">
              <div className="flex gap-6 items-start min-w-max">
                {columns.map((col) => (
                  <div
                    key={col.id}
                    className="bg-slate-100/70 rounded-3xl w-84 flex flex-col border border-slate-200/80 shadow-2xs shrink-0"
                  >
                    {/* Column Header */}
                    <div className="p-4 border-b border-slate-200/60 flex items-center justify-between bg-white/60 rounded-t-3xl">
                      <h3 className="font-bold text-slate-800 text-sm">{col.title}</h3>
                      <span className="bg-white text-slate-600 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                        {col.tasks.length}
                      </span>
                    </div>

                    {/* Column Task Cards */}
                    <div className="p-3 flex-1 flex flex-col gap-3 min-h-[200px]">
                      {col.tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-28 text-slate-400 border-2 border-dashed border-slate-200/80 rounded-2xl bg-white/40 mt-1">
                          <span className="text-xs font-medium">ไม่มีงานในคอลัมน์นี้</span>
                        </div>
                      ) : (
                        col.tasks.map((task) => {
                          const isDone = task.status === "done";
                          const urgency = getUrgency(task);

                          return (
                            <div
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className={`bg-white rounded-2xl p-4 shadow-2xs border transition-all cursor-pointer hover:border-slate-300 hover:shadow-xs ${
                                isDone
                                  ? "border-emerald-200 bg-emerald-50/20"
                                  : urgency?.level === "critical"
                                  ? "border-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.08)]"
                                  : "border-slate-200"
                              }`}
                            >
                              {/* Urgency Badge */}
                              {urgency && (
                                <div className="mb-2.5">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgency.color}`}>
                                    {urgency.text}
                                  </span>
                                </div>
                              )}

                              {/* Subject & Details */}
                              <div className="space-y-1">
                                <h4 className={`font-bold text-slate-900 text-sm leading-snug ${isDone ? "line-through text-slate-400" : ""}`}>
                                  {task.subject}
                                </h4>
                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                  {task.details}
                                </p>
                              </div>

                              {/* Task meta */}
                              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                <div className="flex items-center gap-1.5 font-medium">
                                  <Calendar size={12} />
                                  <span>กำหนด: {task.due_date}</span>
                                </div>
                                {task.teacher_name && (
                                  <span className="font-medium text-slate-600">ครู{task.teacher_name}</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* VIEW 2: DISCIPLINARY PENALTY LOGGER                                       */}
        {/* ------------------------------------------------------------------------- */}
        {activeView === "disciplinary" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Form Column (Left 5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <Gavel size={20} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-800">
                    บันทึกบทลงโทษนักเรียน
                  </h2>
                  <p className="text-xs text-slate-400">
                    คำนวณบทลงโทษและบันทึกลงระบบอัตโนมัติ
                  </p>
                </div>
              </div>

              <form onSubmit={handlePenaltySubmit} className="space-y-4">
                {/* Select Student */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    เลือกลูกศิษย์ <span className="text-rose-500">*</span>
                  </label>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={penaltySearch}
                      onChange={(e) => setPenaltySearch(e.target.value)}
                      placeholder="พิมพ์ค้นหาชื่อ หรือเลขที่..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:bg-white"
                    />
                  </div>

                  <div className="mt-2 max-h-36 overflow-y-auto border border-slate-100 rounded-xl p-1.5 bg-slate-50/50 flex flex-wrap gap-1">
                    {penaltyStudentResults.map((s) => {
                      const isSelected = penaltyStudent?.student_id === s.student_id;
                      return (
                        <button
                          type="button"
                          key={s.student_id}
                          onClick={() => setPenaltyStudent(s)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                            isSelected
                              ? "bg-slate-900 text-white font-bold"
                              : "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-100"
                          }`}
                        >
                          <span className="font-mono text-[10px] opacity-70">#{s.student_no}</span> {s.first_name}
                        </button>
                      );
                    })}
                  </div>

                  {penaltyStudent && (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] flex items-center justify-center font-bold">
                          {penaltyStudent.student_no}
                        </div>
                        <span className="font-bold text-slate-800">
                          {penaltyStudent.prefix}{penaltyStudent.first_name} {penaltyStudent.last_name}
                        </span>
                        {penaltyStudent.nickname && (
                          <span className="text-slate-400">({penaltyStudent.nickname})</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPenaltyStudent(null)}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Incident Text */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    พฤติกรรม / สาเหตุ <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={incidentText}
                    onChange={(e) => setIncidentText(e.target.value)}
                    placeholder="เช่น คุยเสียงดังในคาบ, เล่นเกม, ไม่ส่งการบ้าน..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:bg-white resize-none"
                  />
                </div>

                {/* Severity Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    ระดับความรุนแรง <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(severityConfig) as SeverityLevel[]).map((level) => {
                      const conf = severityConfig[level];
                      const Icon = conf.icon;
                      const isSelected = selectedSeverity === level;

                      return (
                        <button
                          type="button"
                          key={level}
                          onClick={() => setSelectedSeverity(level)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? `${conf.activeBorder} ${conf.activeBg}`
                              : `${conf.border} bg-white`
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon size={14} className={conf.color} />
                            <span className="text-xs font-bold text-slate-800">{conf.title}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">{conf.punishment}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Banner */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                      บทลงโทษอัตโนมัติ
                    </div>
                    <div className="text-xs font-bold text-amber-400 mt-0.5">
                      {severityConfig[selectedSeverity].punishment}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl transition-all shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
                  >
                    <Send size={14} />
                    <span>{isSubmitting ? "กำลังบันทึก..." : "บันทึกโทษ"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Recent Penalties Table (Right 7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-sm">
                  รายการลงโทษล่าสุด ({records.length} รายการ)
                </h3>
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  ม.2/3 Realtime
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-2 font-bold">นักเรียน</th>
                      <th className="py-2.5 px-2 font-bold">ระดับ</th>
                      <th className="py-2.5 px-2 font-bold">สาเหตุ</th>
                      <th className="py-2.5 px-2 font-bold">บทลงโทษ</th>
                      <th className="py-2.5 px-2 font-bold text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.slice(0, 8).map((r) => {
                      const conf = severityConfig[r.severity] || severityConfig.medium;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-2 font-medium text-slate-800">
                            <span className="font-mono text-[10px] text-slate-400 mr-1.5">#{r.student_no}</span>
                            {r.student_name}
                          </td>
                          <td className="py-2.5 px-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${conf.badgeBg}`}>
                              {conf.title}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-slate-600 max-w-[140px] truncate" title={r.incident}>
                            {r.incident}
                          </td>
                          <td className="py-2.5 px-2 text-rose-600 font-bold max-w-[140px] truncate">
                            {r.punishment}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <button
                              onClick={() => handleDeleteRecord(r.id, r.student_name)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="ลบรายการ"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {records.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400">
                          ยังไม่มีบันทึกบทลงโทษ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* VIEW 3: FULL AUDIT HISTORY                                                */}
        {/* ------------------------------------------------------------------------- */}
        {activeView === "history" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">
                  ประวัติบทลงโทษทั้งหมด ({records.length} รายการ)
                </h3>
                <p className="text-xs text-slate-400">
                  ตรวจสอบย้อนหลังและส่งออกรายงานบทลงโทษประจำห้อง
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="ค้นหาชื่อ, เลขที่, สาเหตุ..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <FileText size={14} />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-bold">วันที่</th>
                    <th className="py-2.5 px-3 font-bold">เลขที่</th>
                    <th className="py-2.5 px-3 font-bold">ชื่อ-สกุล</th>
                    <th className="py-2.5 px-3 font-bold">ระดับ</th>
                    <th className="py-2.5 px-3 font-bold">สาเหตุ</th>
                    <th className="py-2.5 px-3 font-bold">บทลงโทษ</th>
                    <th className="py-2.5 px-3 font-bold text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records
                    .filter((r) => {
                      if (!historySearch.trim()) return true;
                      const q = historySearch.toLowerCase();
                      return (
                        r.student_name.toLowerCase().includes(q) ||
                        r.student_id.includes(q) ||
                        r.incident.toLowerCase().includes(q) ||
                        (r.student_nickname && r.student_nickname.toLowerCase().includes(q))
                      );
                    })
                    .map((r) => {
                      const conf = severityConfig[r.severity] || severityConfig.medium;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                            {new Date(r.created_at).toLocaleDateString("th-TH")}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                            #{r.student_no}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {r.student_name}
                            {r.student_nickname && (
                              <span className="text-slate-400 ml-1 font-normal">({r.student_nickname})</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${conf.badgeBg}`}>
                              {conf.title}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 max-w-[200px] truncate" title={r.incident}>
                            {r.incident}
                          </td>
                          <td className="py-2.5 px-3 text-rose-600 font-bold">
                            {r.punishment}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleDeleteRecord(r.id, r.student_name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="ลบรายการ"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* 3. STUDENT SEARCH MODAL (Kanbann StudentSearchModal Style)                 */}
      {/* ========================================================================= */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Search size={18} className="text-rose-500" />
                <h3 className="font-extrabold text-slate-800 text-base">ค้นหานักเรียน ม.2/3</h3>
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchStudentInput}
                onChange={(e) => setSearchStudentInput(e.target.value)}
                placeholder="พิมพ์ชื่อ, นามสกุล, หรือเลขที่..."
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:bg-white"
              />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {modalStudentResults.map((s) => (
                <div
                  key={s.student_id}
                  onClick={() => {
                    setSelectedStudent(s);
                    setIsSearchOpen(false);
                    toast.success(`กำลังติดตาม ${s.first_name} ✨`);
                  }}
                  className="p-3 rounded-2xl border border-slate-100 hover:border-rose-200 hover:bg-rose-50/40 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-mono text-xs font-bold flex items-center justify-center">
                      #{s.student_no}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {s.first_name} {s.last_name}
                        {s.nickname && <span className="ml-1 text-slate-400 font-normal">({s.nickname})</span>}
                      </div>
                      <div className="text-[10px] text-slate-400">รหัส {s.student_id}</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                    เลือก
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TASK DETAIL MODAL                                                      */}
      {/* ========================================================================= */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase font-mono">
                  {selectedTask.subject}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  {selectedTask.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">
                  รายละเอียดการบ้าน
                </span>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedTask.details}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">กำหนดส่ง</span>
                  <span className="font-extrabold text-slate-800 text-sm">{selectedTask.due_date}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">ครูผู้สั่ง</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedTask.teacher_name ? `ครู${selectedTask.teacher_name}` : "-"}
                  </span>
                </div>
              </div>

              {selectedTask.submission_method && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">ช่องทางการส่ง</span>
                  <span className="font-medium text-slate-700">{selectedTask.submission_method}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MOBILE BOTTOM NAVIGATION (Kanbann Mobile Style)                        */}
      {/* ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveView("assignments")}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer ${
            activeView === "assignments" ? "text-rose-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <BookOpen size={18} />
          <span>การบ้าน</span>
        </button>

        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex flex-col items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <Users size={18} />
          <span>เลือกนักเรียน</span>
        </button>

        <button
          onClick={() => setActiveView("disciplinary")}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer ${
            activeView === "disciplinary" ? "text-rose-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Gavel size={18} />
          <span>ลงโทษ</span>
        </button>

        <button
          onClick={() => setActiveView("history")}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer ${
            activeView === "history" ? "text-rose-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Clock size={18} />
          <span>ประวัติ</span>
        </button>

        <button
          onClick={handleExportCSV}
          className="flex flex-col items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <FileText size={18} className="text-emerald-600" />
          <span>CSV</span>
        </button>
      </nav>

    </div>
  );
}
