"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Flame,
  AlertTriangle,
  Leaf,
  FileText,
  Trash2,
  Search,
  ExternalLink,
  Gavel,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Check,
  Menu,
  X,
  ArrowUpRight,
  BookOpen,
  CheckSquare,
  AlertCircle,
  ChevronDown,
  User,
  TrendingUp,
  Filter,
  BarChart3,
  Calendar,
  Send,
  Plus,
  ArrowRight,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { Student, PenaltyRecord, SeverityLevel, HomeworkTask, TaskCompletion } from "@/types/penalty";
import { createPenaltyRecord, deletePenaltyRecord } from "@/app/actions";

interface DisciplinaryAppProps {
  initialStudents: Student[];
  initialRecords: PenaltyRecord[];
  initialTasks: HomeworkTask[];
  initialCompletions: TaskCompletion[];
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
    levelNum: number;
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
    levelNum: 1,
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
    levelNum: 2,
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
    levelNum: 3,
  },
  strict: {
    title: "ส่งห้องปกครอง",
    punishment: "ให้ใบปกครอง & เชิญผู้ปกครอง",
    icon: ShieldAlert,
    color: "text-purple-600",
    badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
    badgeText: "text-purple-600",
    border: "border-slate-200 hover:border-purple-300",
    activeBorder: "border-purple-600 ring-2 ring-purple-600/20",
    activeBg: "bg-purple-50/70",
    levelNum: 4,
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

  // Tabs: overview, student_progress, tasks, history
  const [activeTab, setActiveTab] = useState<"overview" | "student_progress" | "tasks" | "history">("overview");

  // Selection states
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchStudent, setSearchStudent] = useState("");
  const [incidentText, setIncidentText] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel>("medium");

  // Student drill-down in "student_progress"
  const [inspectedStudentId, setInspectedStudentId] = useState<string | null>(null);
  const [studentListSearch, setStudentListSearch] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState<"all" | "pending_work" | "clean_work" | "penalized">("all");

  // Homework Tasks Filter
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "done">("all");
  const [taskSearch, setTaskSearch] = useState("");

  // History search & filter
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<string>("all");

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // -------------------------------------------------------------
  // Data Mapping & Lookups
  // -------------------------------------------------------------
  // Map completion key `${student_id}_${task_id}` -> status
  const completionMap = useMemo(() => {
    const map = new Map<string, string>();
    completions.forEach((c) => {
      map.set(`${c.student_id}_${c.task_id}`, c.status);
    });
    return map;
  }, [completions]);

  // Aggregate stats per student
  const studentMetrics = useMemo(() => {
    return students.map((s) => {
      // Completed vs pending tasks for this student
      let completedTasksCount = 0;
      const pendingTaskDetails: HomeworkTask[] = [];
      const completedTaskDetails: HomeworkTask[] = [];

      tasks.forEach((t) => {
        const status = completionMap.get(`${s.student_id}_${t.id}`);
        // If task is globally marked done or this student completed it
        if (status === "done" || t.status === "done") {
          completedTasksCount++;
          completedTaskDetails.push(t);
        } else {
          pendingTaskDetails.push(t);
        }
      });

      const totalTasks = tasks.length;
      const pendingTasksCount = pendingTaskDetails.length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 100;

      // Penalties for this student
      const studentPenalties = records.filter((r) => r.student_id === s.student_id);

      return {
        student: s,
        totalTasks,
        completedTasksCount,
        pendingTasksCount,
        completionRate,
        pendingTaskDetails,
        completedTaskDetails,
        penalties: studentPenalties,
        penaltyCount: studentPenalties.length,
      };
    });
  }, [students, tasks, completionMap, records]);

  // Filtered Students for the Individual Progress tab
  const filteredStudentMetrics = useMemo(() => {
    return studentMetrics.filter(({ student, pendingTasksCount, penaltyCount }) => {
      const q = studentListSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        student.first_name.toLowerCase().includes(q) ||
        student.last_name.toLowerCase().includes(q) ||
        student.student_id.includes(q) ||
        student.student_no.toString() === q ||
        (student.nickname && student.nickname.toLowerCase().includes(q));

      let matchFilter = true;
      if (studentStatusFilter === "pending_work") {
        matchFilter = pendingTasksCount > 0;
      } else if (studentStatusFilter === "clean_work") {
        matchFilter = pendingTasksCount === 0;
      } else if (studentStatusFilter === "penalized") {
        matchFilter = penaltyCount > 0;
      }

      return matchSearch && matchFilter;
    });
  }, [studentMetrics, studentListSearch, studentStatusFilter]);

  // Active student drill-down item
  const currentInspected = useMemo(() => {
    if (!inspectedStudentId) return null;
    return studentMetrics.find((sm) => sm.student.student_id === inspectedStudentId) || null;
  }, [inspectedStudentId, studentMetrics]);

  // Filtered Students for the penalty form selector
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

  // Overall Tasks Metrics
  const taskStats = useMemo(() => {
    const total = tasks.length;
    let doneCount = 0;
    let pendingCount = 0;
    tasks.forEach((t) => {
      if (t.status === "done") doneCount++;
      else pendingCount++;
    });
    const completionRate = total > 0 ? Math.round((doneCount / total) * 100) : 0;
    return { total, doneCount, pendingCount, completionRate };
  }, [tasks]);

  // Filtered Homework Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        !taskSearch ||
        t.subject.toLowerCase().includes(taskSearch.toLowerCase()) ||
        t.details.toLowerCase().includes(taskSearch.toLowerCase()) ||
        (t.teacher_name && t.teacher_name.toLowerCase().includes(taskSearch.toLowerCase()));

      const matchFilter =
        taskFilter === "all" ||
        (taskFilter === "done" && t.status === "done") ||
        (taskFilter === "pending" && t.status !== "done");

      return matchSearch && matchFilter;
    });
  }, [tasks, taskSearch, taskFilter]);

  // Global Disciplinary Analytics
  const metrics = useMemo(() => {
    const total = records.length;
    const severeCount = records.filter(
      (r) => r.severity === "high" || r.severity === "strict"
    ).length;
    const studentsWithPenalty = new Set(records.map((r) => r.student_id)).size;
    const cleanStudents = Math.max(0, students.length - studentsWithPenalty);

    const counts = { low: 0, medium: 0, high: 0, strict: 0 };
    records.forEach((r) => {
      if (counts[r.severity] !== undefined) counts[r.severity]++;
    });

    const studentsWithPendingWork = studentMetrics.filter((sm) => sm.pendingTasksCount > 0).length;

    return { total, severeCount, studentsWithPenalty, cleanStudents, counts, studentsWithPendingWork };
  }, [records, students, studentMetrics]);

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

      const matchFilter = historyFilter === "all" || r.severity === historyFilter;

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

  // Export to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (records.length === 0) {
      showToast("ยังไม่มีข้อมูลสำหรับส่งออก CSV");
      return;
    }

    const headers = [
      "ลำดับ",
      "รหัสนักเรียน",
      "เลขที่",
      "ชื่อ-สกุล",
      "ชื่อเล่น",
      "ระดับความรุนแรง",
      "สาเหตุ",
      "บทลงโทษ",
      "วันที่บันทึก",
    ];
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
    showToast("ส่งออกไฟล์ CSV สำเร็จแล้ว 📄");
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 antialiased font-sans pb-20 lg:pb-0">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2.5 rounded-xl bg-slate-900 text-white px-4 py-3 text-sm shadow-xl border border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SIDEBAR (Desktop Nuxt Dashboard Style) */}
      {/* ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200/80 bg-white flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Workspace Brand Badge */}
        <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-bold shadow-xs">
              <Gavel className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <div className="font-semibold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
                โอมจ๋า <span className="text-[10px] bg-rose-50 text-rose-600 font-semibold px-2 py-0.5 rounded-md border border-rose-100">ม.2/3</span>
              </div>
              <div className="text-[11px] text-slate-400">Class & Disciplinary Admin</div>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Menu Navigation
          </div>

          {/* Tab 1: Overview */}
          <button
            onClick={() => {
              setActiveTab("overview");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "overview"
                ? "bg-slate-100 text-slate-900 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className={`h-4 w-4 ${activeTab === "overview" ? "text-slate-900" : "text-slate-400"}`} />
              <span>ภาพรวม & บันทึกบทลงโทษ</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/60 font-mono text-slate-600">
              {records.length}
            </span>
          </button>

          {/* Tab 2: Individual Student Progress (ดูงานรายคน) */}
          <button
            onClick={() => {
              setActiveTab("student_progress");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "student_progress"
                ? "bg-rose-50 text-rose-700 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className={`h-4 w-4 ${activeTab === "student_progress" ? "text-rose-600" : "text-slate-400"}`} />
              <span>ติดตามรายคน (เช็กงานค้าง)</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100/70 font-mono text-rose-700 font-semibold">
              {students.length}
            </span>
          </button>

          {/* Tab 3: Homework & Room Tasks */}
          <button
            onClick={() => {
              setActiveTab("tasks");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "tasks"
                ? "bg-indigo-50 text-indigo-700 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className={`h-4 w-4 ${activeTab === "tasks" ? "text-indigo-600" : "text-slate-400"}`} />
              <span>การบ้าน & งานห้อง</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100/60 font-mono text-indigo-700 font-semibold">
              {tasks.length}
            </span>
          </button>

          {/* Tab 4: History Table */}
          <button
            onClick={() => {
              setActiveTab("history");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "history"
                ? "bg-amber-50 text-amber-800 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className={`h-4 w-4 ${activeTab === "history" ? "text-amber-600" : "text-slate-400"}`} />
              <span>ประวัติบทลงโทษทั้งหมด</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100/60 font-mono text-amber-800 font-semibold">
              {records.length}
            </span>
          </button>

          {/* Section: Shortcuts & Linked Apps */}
          <div className="pt-4 px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            เชื่อมต่อระบบ
          </div>

          <a
            href="https://primjaa.bungkii.app"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Layers className="h-4 w-4 text-slate-400" />
              <span>พริมจ๋า (Kanbann ม.2/3)</span>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
          </a>

          {/* Class Mini Summary Widget */}
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span>นักเรียนค้างงาน</span>
              <span className="font-semibold text-rose-600 font-mono">{metrics.studentsWithPendingWork} คน</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>อัตราส่งงานรวม</span>
              <span className="font-semibold text-emerald-600 font-mono">{taskStats.completionRate}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${taskStats.completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-2.5 px-1 py-1">
            <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center shrink-0">
              ครู
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-slate-800 truncate">ครูประจำชั้น ม.2/3</div>
              <div className="text-[10px] text-slate-400 truncate">Supabase SSR + Next.js 16</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN CONTAINER */}
      {/* ========================================================================= */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        
        {/* HEADER NAVBAR (Nuxt UI Dashboard Navbar) */}
        <header className="sticky top-0 z-30 h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-900">
              <span>โอมจ๋า</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500 font-normal">
                {activeTab === "overview" && "Dashboard & Disciplinary Log"}
                {activeTab === "student_progress" && "ติดตามงานรายบุคคล (Checklist)"}
                {activeTab === "tasks" && "Classroom Homework & Tasks"}
                {activeTab === "history" && "Audit & Disciplinary History"}
              </span>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="ส่งออกประวัติเป็นไฟล์ CSV"
            >
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              <span>ส่งออก CSV</span>
            </button>

            <a
              href="https://primjaa.bungkii.app"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">พริมจ๋า ม.2/3</span>
            </a>
          </div>
        </header>

        {/* SUB-TOOLBAR (Nuxt UDashboardToolbar) */}
        <div className="border-b border-slate-200/80 bg-white px-4 sm:px-6 py-2.5 flex items-center justify-between overflow-x-auto gap-4">
          <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === "overview"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ภาพรวม & ลงโทษ
            </button>
            <button
              onClick={() => setActiveTab("student_progress")}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === "student_progress"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ตรวจงานรายคน
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === "tasks"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              รายการการบ้าน ({tasks.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === "history"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ประวัติ ({records.length})
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono shrink-0 hidden md:block">
            ห้อง ม.2/3 • นักเรียน {students.length} คน • งานห้อง {tasks.length} รายการ
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BODY CONTENT */}
        {/* ========================================================================= */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW & DISCIPLINARY LOG */}
          {/* ========================================================================= */}
          {activeTab === "overview" && (
            <>
              {/* Nuxt Dashboard KPI Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Metric 1 */}
                <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 text-xs uppercase font-medium">
                    <span>เคสวินัยทั้งหมด</span>
                    <Gavel className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 font-mono">
                      {metrics.total}
                    </span>
                    <span className="text-[11px] font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                      สะสม
                    </span>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 text-xs uppercase font-medium">
                    <span>คนค้างส่งการบ้าน</span>
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-amber-600 font-mono">
                      {metrics.studentsWithPendingWork}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      จาก {students.length} คน
                    </span>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 text-xs uppercase font-medium">
                    <span>ส่งห้องปกครอง</span>
                    <ShieldAlert className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-purple-600 font-mono">
                      {metrics.counts.strict}
                    </span>
                    <span className="text-[11px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                      ระดับ 4
                    </span>
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 text-xs uppercase font-medium">
                    <span>อัตราส่งงานห้อง</span>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-emerald-600 font-mono">
                      {taskStats.completionRate}%
                    </span>
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {taskStats.doneCount}/{taskStats.total}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main 2-Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Column Left (5 cols): Modern Disciplinary Logger Form */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                        <Gavel className="h-4 w-4" />
                      </div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        บันทึกการกระทำผิด & กำหนดบทลงโทษ
                      </h2>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">AUTO CALC</span>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Student Selection */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        เลือกนักเรียน <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={searchStudent}
                          onChange={(e) => setSearchStudent(e.target.value)}
                          placeholder="พิมพ์ค้นหาชื่อ หรือเลขที่..."
                          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all"
                        />
                      </div>

                      {/* Student Chips */}
                      <div className="mt-2 max-h-36 overflow-y-auto custom-scrollbar border border-slate-200/60 rounded-lg p-1.5 bg-slate-50/50 flex flex-wrap gap-1">
                        {filteredStudents.slice(0, 15).map((s) => {
                          const isSelected = selectedStudent?.student_id === s.student_id;
                          return (
                            <button
                              type="button"
                              key={s.student_id}
                              onClick={() => setSelectedStudent(s)}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? "bg-slate-900 text-white shadow-2xs"
                                  : "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-100"
                              }`}
                            >
                              <span className="font-mono text-[10px] opacity-70">#{s.student_no}</span>
                              <span>{s.first_name}</span>
                              {s.nickname && <span className="text-[10px] text-slate-400">({s.nickname})</span>}
                            </button>
                          );
                        })}
                      </div>

                      {selectedStudent && (
                        <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] flex items-center justify-center font-bold">
                              {selectedStudent.student_no}
                            </div>
                            <span className="font-medium text-slate-900">
                              {selectedStudent.prefix}{selectedStudent.first_name} {selectedStudent.last_name}
                            </span>
                            {selectedStudent.nickname && (
                              <span className="text-slate-400">({selectedStudent.nickname})</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(null)}
                            className="text-slate-400 hover:text-rose-500"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Incident Input */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        สาเหตุ / พฤติกรรมที่กระทำผิด <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={incidentText}
                        onChange={(e) => setIncidentText(e.target.value)}
                        placeholder="เช่น คุยเสียงดังในคาบ, เล่นเกม, ไม่ส่งการบ้านวิทย์..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all resize-none"
                      />
                    </div>

                    {/* Severity Selection (Nuxt UI Cards) */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-2">
                        ระดับความรุนแรง <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(severityConfig) as SeverityLevel[]).map((level) => {
                          const config = severityConfig[level];
                          const Icon = config.icon;
                          const isSelected = selectedSeverity === level;

                          return (
                            <button
                              type="button"
                              key={level}
                              onClick={() => setSelectedSeverity(level)}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? `${config.activeBorder} ${config.activeBg}`
                                  : `${config.border} bg-white`
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <Icon className={`h-4 w-4 ${config.color}`} />
                                  <span className="text-xs font-semibold text-slate-800">
                                    {config.title}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">
                                  Lv.{config.levelNum}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {config.punishment}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Punishment Preview Banner */}
                    <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                          บทลงโทษตามเกณฑ์ระบบ
                        </div>
                        <div className="text-xs font-semibold text-amber-400 mt-0.5">
                          {severityConfig[selectedSeverity].punishment}
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>{isPending ? "กำลังบันทึก..." : "บันทึกโทษ"}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Column Right (7 cols): Nuxt UI Table of Recent Records */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                          บันทึกล่าสุด (Recent Penalties)
                        </h2>
                        <p className="text-xs text-slate-400">รายการพฤติกรรมและบทลงโทษในห้องเรียน</p>
                      </div>
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {records.length} รายการ
                      </span>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                            <th className="py-2 px-2 font-medium">นักเรียน</th>
                            <th className="py-2 px-2 font-medium">ระดับ</th>
                            <th className="py-2 px-2 font-medium">สาเหตุ</th>
                            <th className="py-2 px-2 font-medium">บทลงโทษ</th>
                            <th className="py-2 px-2 font-medium text-right">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {records.slice(0, 6).map((r) => {
                            const config = severityConfig[r.severity] || severityConfig.medium;
                            return (
                              <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-2.5 px-2">
                                  <div className="font-medium text-slate-900 flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] text-slate-400">#{r.student_no}</span>
                                    <span>{r.student_name}</span>
                                  </div>
                                  {r.student_nickname && (
                                    <span className="text-[10px] text-slate-400">({r.student_nickname})</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.badgeBg}`}>
                                    {config.title}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2 text-slate-600 max-w-[140px] truncate" title={r.incident}>
                                  {r.incident}
                                </td>
                                <td className="py-2.5 px-2 text-rose-600 font-medium max-w-[140px] truncate">
                                  {r.punishment}
                                </td>
                                <td className="py-2.5 px-2 text-right">
                                  <button
                                    onClick={() => handleDelete(r.id, r.student_name)}
                                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="ลบรายการ"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {records.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400">
                                ยังไม่มีข้อมูลการบันทึกบทลงโทษ
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500 mt-4">
                    <span>แสดง 6 รายการล่าสุด</span>
                    <button
                      onClick={() => setActiveTab("history")}
                      className="text-slate-900 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>ดูประวัติทั้งหมด ({records.length})</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: INDIVIDUAL STUDENT PROGRESS (ตรวจงานรายคน) */}
          {/* ========================================================================= */}
          {activeTab === "student_progress" && (
            <div className="space-y-6">
              
              {/* Filter and Search Bar for Students */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={studentListSearch}
                    onChange={(e) => setStudentListSearch(e.target.value)}
                    placeholder="ค้นหาชื่อ, สกุล, หรือเลขที่นักเรียน..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                  <button
                    onClick={() => setStudentStatusFilter("all")}
                    className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                      studentStatusFilter === "all"
                        ? "bg-slate-900 text-white border-slate-900 font-medium"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    ทั้งหมด ({students.length})
                  </button>
                  <button
                    onClick={() => setStudentStatusFilter("pending_work")}
                    className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                      studentStatusFilter === "pending_work"
                        ? "bg-rose-600 text-white border-rose-600 font-medium"
                        : "bg-white text-rose-600 border-rose-200 hover:bg-rose-50"
                    }`}
                  >
                    ค้างงาน ({metrics.studentsWithPendingWork})
                  </button>
                  <button
                    onClick={() => setStudentStatusFilter("clean_work")}
                    className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                      studentStatusFilter === "clean_work"
                        ? "bg-emerald-600 text-white border-emerald-600 font-medium"
                        : "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    }`}
                  >
                    ส่งครบแล้ว
                  </button>
                  <button
                    onClick={() => setStudentStatusFilter("penalized")}
                    className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                      studentStatusFilter === "penalized"
                        ? "bg-amber-600 text-white border-amber-600 font-medium"
                        : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
                    }`}
                  >
                    มีบันทึกโทษ ({metrics.studentsWithPenalty})
                  </button>
                </div>
              </div>

              {/* Master-Detail Split Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Master Column (Left 5 cols): Student List */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col h-[650px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2 px-1">
                    <span className="text-xs font-semibold text-slate-900">
                      รายชื่อนักเรียน ({filteredStudentMetrics.length} คน)
                    </span>
                    <span className="text-[11px] text-slate-400">คลิกเพื่อดูรายละเอียด</span>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                    {filteredStudentMetrics.map(({ student, pendingTasksCount, completionRate, penaltyCount }) => {
                      const isSelected = inspectedStudentId === student.student_id;
                      return (
                        <div
                          key={student.student_id}
                          onClick={() => setInspectedStudentId(student.student_id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                              : "bg-white text-slate-800 border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/70"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`h-7 w-7 rounded-lg font-mono text-xs flex items-center justify-center font-bold shrink-0 ${
                                isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {student.student_no}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium truncate">
                                {student.first_name} {student.last_name}
                                {student.nickname && (
                                  <span className={isSelected ? "text-slate-300" : "text-slate-400"}> ({student.nickname})</span>
                                )}
                              </div>
                              <div className={`text-[10px] ${isSelected ? "text-slate-400" : "text-slate-400"}`}>
                                รหัส {student.student_id}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {penaltyCount > 0 && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                  isSelected ? "bg-rose-500/30 text-rose-200" : "bg-rose-50 text-rose-600 font-semibold"
                                }`}
                                title={`มีโทษ ${penaltyCount} ครั้ง`}
                              >
                                {penaltyCount} โทษ
                              </span>
                            )}

                            {pendingTasksCount > 0 ? (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                  isSelected
                                    ? "bg-amber-400/20 text-amber-300"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                ค้าง {pendingTasksCount}
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                  isSelected
                                    ? "bg-emerald-400/20 text-emerald-300"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                }`}
                              >
                                ครบ 100%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {filteredStudentMetrics.length === 0 && (
                      <div className="py-12 text-center text-xs text-slate-400">
                        ไม่พบข้อมูลนักเรียนที่ค้นหา
                      </div>
                    )}
                  </div>
                </div>

                {/* Detail Column (Right 7 cols): Student Progress Details */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 flex flex-col h-[650px]">
                  {currentInspected ? (
                    <div className="flex flex-col h-full space-y-4">
                      {/* Header Card of the Inspected Student */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-xl bg-slate-900 text-white font-mono text-base font-bold flex items-center justify-center">
                            #{currentInspected.student.student_no}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              {currentInspected.student.prefix}{currentInspected.student.first_name} {currentInspected.student.last_name}
                              {currentInspected.student.nickname && (
                                <span className="ml-1.5 text-xs text-slate-500 font-normal">
                                  ({currentInspected.student.nickname})
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">
                              รหัสนักเรียน: {currentInspected.student.student_id} • ชั้นมัธยมศึกษาปีที่ 2/3
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs text-slate-400">ความคืบหน้าการบ้าน</div>
                          <div className="text-lg font-bold text-slate-900 font-mono">
                            {currentInspected.completionRate}%
                          </div>
                        </div>
                      </div>

                      {/* Content Split: Pending Tasks & Completed Tasks */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                        
                        {/* 1. Pending Tasks Section */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                              <AlertCircle className="h-3.5 w-3.5" />
                              การบ้านที่ยังค้างอยู่ ({currentInspected.pendingTasksCount} รายการ)
                            </span>
                          </div>

                          {currentInspected.pendingTaskDetails.length > 0 ? (
                            <div className="space-y-2">
                              {currentInspected.pendingTaskDetails.map((t) => (
                                <div
                                  key={t.id}
                                  className="p-3 rounded-xl border border-rose-100 bg-rose-50/40 text-xs flex items-start justify-between gap-3"
                                >
                                  <div>
                                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                                      <span>{t.subject}</span>
                                      {t.teacher_name && (
                                        <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                          ครู{t.teacher_name}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-slate-600 mt-0.5">{t.details}</p>
                                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> กำหนดส่ง: {t.due_date}
                                      </span>
                                      {t.submission_method && (
                                        <span>• ส่งทาง: {t.submission_method}</span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full shrink-0">
                                    ยังไม่ส่ง
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center text-xs text-emerald-700 font-medium">
                              🎉 ไม่มีงานค้าง! ส่งงานครบทั้งหมดแล้ว
                            </div>
                          )}
                        </div>

                        {/* 2. Penalties Record for this Student */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                              <ShieldAlert className="h-3.5 w-3.5 text-purple-600" />
                              ประวัติบทลงโทษ ({currentInspected.penaltyCount} รายการ)
                            </span>
                          </div>

                          {currentInspected.penalties.length > 0 ? (
                            <div className="space-y-2">
                              {currentInspected.penalties.map((p) => {
                                const conf = severityConfig[p.severity] || severityConfig.medium;
                                return (
                                  <div
                                    key={p.id}
                                    className="p-3 rounded-xl border border-slate-200 bg-white text-xs flex items-center justify-between"
                                  >
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${conf.badgeBg}`}>
                                          {conf.title}
                                        </span>
                                        <span className="font-medium text-slate-800">{p.incident}</span>
                                      </div>
                                      <div className="text-[11px] text-rose-600 mt-1">
                                        บทลงโทษ: {p.punishment}
                                      </div>
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {new Date(p.created_at).toLocaleDateString("th-TH")}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
                              นักเรียนคนนี้ประวัติดี ไม่มีบันทึกบทลงโทษ
                            </div>
                          )}
                        </div>

                        {/* 3. Completed Tasks */}
                        {currentInspected.completedTaskDetails.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              งานที่ส่งเรียบร้อย ({currentInspected.completedTasksCount} รายการ)
                            </div>
                            <div className="space-y-1.5">
                              {currentInspected.completedTaskDetails.map((t) => (
                                <div
                                  key={t.id}
                                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs flex items-center justify-between text-slate-600"
                                >
                                  <span>{t.subject}: {t.details}</span>
                                  <span className="text-[10px] text-emerald-600 font-medium">✓ เสร็จแล้ว</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
                      <User className="h-10 w-10 text-slate-300" />
                      <div className="text-sm font-medium text-slate-600">
                        เลือกนักเรียนจากรายการด้านซ้าย
                      </div>
                      <p className="text-xs max-w-xs">
                        เพื่อดูว่านักเรียนคนนั้นยังค้างการบ้านวิชาไหนบ้าง ส่งอะไรไปแล้ว และมีประวัติบทลงโทษหรือไม่
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: HOMEWORK TASKS (การบ้านห้อง) */}
          {/* ========================================================================= */}
          {activeTab === "tasks" && (
            <div className="space-y-6">
              
              {/* Task Header & Filters */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="ค้นหาวิชา, รายละเอียดการบ้าน, หรือชื่อครู..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                    <button
                      onClick={() => setTaskFilter("all")}
                      className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                        taskFilter === "all" ? "bg-white text-slate-900 font-semibold shadow-2xs" : "text-slate-600"
                      }`}
                    >
                      ทั้งหมด ({tasks.length})
                    </button>
                    <button
                      onClick={() => setTaskFilter("pending")}
                      className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                        taskFilter === "pending" ? "bg-white text-rose-600 font-semibold shadow-2xs" : "text-slate-600"
                      }`}
                    >
                      รอดำเนินการ ({taskStats.pendingCount})
                    </button>
                    <button
                      onClick={() => setTaskFilter("done")}
                      className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                        taskFilter === "done" ? "bg-white text-emerald-600 font-semibold shadow-2xs" : "text-slate-600"
                      }`}
                    >
                      เสร็จสิ้น ({taskStats.doneCount})
                    </button>
                  </div>

                  <a
                    href="https://primjaa.bungkii.app"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>จัดการใน Kanbann</span>
                  </a>
                </div>
              </div>

              {/* Tasks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasks.map((t) => {
                  const isDone = t.status === "done";
                  return (
                    <div
                      key={t.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-800">
                            {t.subject}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isDone
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {isDone ? "✓ เสร็จแล้ว" : "รอดำเนินการ"}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                            {t.details}
                          </h3>
                        </div>

                        <div className="text-xs text-slate-500 space-y-1 pt-1">
                          {t.teacher_name && (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              <span>ครูผู้สอน: ครู{t.teacher_name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>กำหนดส่ง: {t.due_date}</span>
                          </div>
                          {t.submission_method && (
                            <div className="text-[11px] text-slate-400">
                              ช่องทางส่ง: {t.submission_method}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px]">
                          {t.work_type === "group" ? `งานกลุ่ม (${t.group_size} คน)` : "งานเดี่ยว"}
                        </span>
                        <button
                          onClick={() => {
                            setActiveTab("student_progress");
                            setStudentStatusFilter("pending_work");
                          }}
                          className="text-slate-900 font-semibold hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <span>ดูว่าใครยังไม่ส่ง</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredTasks.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs">
                  ไม่พบรายการการบ้าน
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: AUDIT HISTORY */}
          {/* ========================================================================= */}
          {activeTab === "history" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    ประวัติบทลงโทษและพฤติกรรมทั้งหมด ({records.length} รายการ)
                  </h2>
                  <p className="text-xs text-slate-400">
                    จัดเก็บและเชื่อมต่อผ่านฐานข้อมูล Supabase SSR
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="ค้นหาชื่อ, สาเหตุ..."
                      className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:bg-white"
                    />
                  </div>
                  <select
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
                  >
                    <option value="all">ทุกระดับ</option>
                    <option value="low">รุนแรงน้อย</option>
                    <option value="medium">รุนแรงกลาง</option>
                    <option value="high">รุนแรงมาก</option>
                    <option value="strict">ส่งห้องปกครอง</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 font-medium">วันที่</th>
                      <th className="py-2.5 px-3 font-medium">เลขที่</th>
                      <th className="py-2.5 px-3 font-medium">ชื่อ-สกุล</th>
                      <th className="py-2.5 px-3 font-medium">ระดับ</th>
                      <th className="py-2.5 px-3 font-medium">สาเหตุ</th>
                      <th className="py-2.5 px-3 font-medium">บทลงโทษที่กำหนด</th>
                      <th className="py-2.5 px-3 font-medium text-right">การกระทำ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map((r) => {
                      const config = severityConfig[r.severity] || severityConfig.medium;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                            {new Date(r.created_at).toLocaleDateString("th-TH")}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                            #{r.student_no}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {r.student_name}
                            {r.student_nickname && (
                              <span className="text-slate-400 ml-1">({r.student_nickname})</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.badgeBg}`}>
                              {config.title}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 max-w-[200px] truncate" title={r.incident}>
                            {r.incident}
                          </td>
                          <td className="py-2.5 px-3 text-rose-600 font-medium">
                            {r.punishment}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleDelete(r.id, r.student_name)}
                              className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="ลบรายการ"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredRecords.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400">
                          ไม่พบประวัติที่ตรงกับเงื่อนไข
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (Full Mobile Responsive Support) */}
      {/* ========================================================================= */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1.5 flex items-center justify-around">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
            activeTab === "overview" ? "text-slate-900 font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>แดชบอร์ด</span>
        </button>

        <button
          onClick={() => setActiveTab("student_progress")}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
            activeTab === "student_progress" ? "text-rose-600 font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>ตรวจรายคน</span>
        </button>

        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
            activeTab === "tasks" ? "text-indigo-600 font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>การบ้าน</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
            activeTab === "history" ? "text-amber-700 font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>ประวัติ</span>
        </button>

        <button
          onClick={handleExportCSV}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium text-slate-500 hover:text-slate-800"
        >
          <FileText className="h-4 w-4 text-emerald-600" />
          <span>CSV</span>
        </button>
      </nav>
    </div>
  );
}
