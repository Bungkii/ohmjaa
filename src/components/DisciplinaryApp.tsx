"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  Trophy,
  CheckCircle2,
  Clock,
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
  Dumbbell,
  MessageCircle,
  FileX,
  Sun,
  SunMedium,
  Timer,
  Shirt,
  MoreHorizontal,
  Brush,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { startOfDay, isBefore, isToday, isTomorrow, differenceInDays } from "date-fns";
import { Student, PenaltyRecord, SeverityLevel, HomeworkTask, TaskCompletion } from "@/types/penalty";
import {
  createPenaltyRecord,
  createPenaltyRecordsBulk,
  deletePenaltyRecord,
  updatePenaltyRecord,
  updateTaskCompletion,
} from "@/app/actions";

export interface TeacherAuditEntry {
  id: number;
  teacher_id: string;
  actor_email: string;
  action: string;
  entity: string;
  entity_id: string;
  student_id: string;
  created_at: string;
}

export interface TeacherTaskReview {
  teacher_id: string;
  student_id: string;
  task_id: string;
  reviewed_at: string;
}

interface DisciplinaryAppProps {
  initialStudents: Student[];
  initialRecords: PenaltyRecord[];
  initialTasks: HomeworkTask[];
  initialCompletions: TaskCompletion[];
  initialAudit?: TeacherAuditEntry[];
  initialReviews?: TeacherTaskReview[];
  teacherEmail?: string;
}

export function formatStudentFullName(student: Student): string {
  const prefix = student.prefix === "ด.ญ." ? "เด็กหญิง" : student.prefix === "ด.ช." ? "เด็กชาย" : student.prefix;
  return `${prefix}${student.first_name} ${student.last_name}`;
}

export function getStudentAvatar(student: Student): string {
  return student.prefix === "ด.ญ." ? "/student-girl.webp" : "/student-boy.webp";
}

export function getUrgency(task: HomeworkTask) {
  if (task.status === "done") return null;
  const due = startOfDay(new Date(task.due_date));
  const today = startOfDay(new Date());

  if (isBefore(due, today)) {
    return { level: "critical", text: "เกินกำหนด", color: "text-red-700 bg-red-50 border-red-200" };
  } else if (isToday(due)) {
    return { level: "warning", text: "ครบกำหนดวันนี้", color: "text-amber-700 bg-amber-50 border-amber-200" };
  } else if (isTomorrow(due) || differenceInDays(due, today) <= 2) {
    return { level: "warning", text: "ใกล้ถึงกำหนด", color: "text-amber-700 bg-amber-100 border-amber-200" };
  } else {
    return { level: "chill", text: "ยังไม่ถึงกำหนด", color: "text-slate-600 bg-slate-50 border-slate-200" };
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

const BEHAVIOR_PRESETS = [
  {
    id: "sports",
    label: "เล่นกีฬาในห้อง",
    sub: "เล่นกีฬาในห้องเรียน",
    icon: Dumbbell,
  },
  {
    id: "talking",
    label: "พูดคุย",
    sub: "คุยเสียงดังในห้อง",
    icon: MessageCircle,
  },
  {
    id: "no_homework",
    label: "ไม่ส่งงาน",
    sub: "ค้างส่งการบ้าน/งาน",
    icon: FileX,
  },
  {
    id: "late_morning",
    label: "สายเช้า",
    sub: "มาไม่ทันช่วงเช้า",
    icon: Sun,
  },
  {
    id: "late_noon",
    label: "สายเที่ยง",
    sub: "เข้าแถวเที่ยงช้า",
    icon: SunMedium,
  },
  {
    id: "late_break10",
    label: "สายพัก 10",
    sub: "กลับจากพักช้า",
    icon: Timer,
  },
  {
    id: "uniform",
    label: "เครื่องแต่งกาย",
    sub: "ตรวจระเบียบ/ชุด",
    icon: Shirt,
  },
  {
    id: "other",
    label: "อื่น ๆ",
    sub: "ระบุหมายเหตุ",
    icon: MoreHorizontal,
  },
];

const CHORE_DURATIONS = ["1 วัน", "1 สัปดาห์", "1 เดือน", "1 ปีการศึกษา", "อื่นๆ"];

export default function DisciplinaryApp({
  initialStudents,
  initialRecords,
  initialTasks,
  initialCompletions,
  initialAudit,
  initialReviews,
  teacherEmail,
}: DisciplinaryAppProps) {
  const [students] = useState<Student[]>(initialStudents);
  const [records, setRecords] = useState<PenaltyRecord[]>(initialRecords);
  const [tasks] = useState<HomeworkTask[]>(initialTasks);
  const [completions, setCompletions] = useState<TaskCompletion[]>(initialCompletions);
  const [audit, setAudit] = useState<TeacherAuditEntry[]>(initialAudit ?? []);
  const [reviews, setReviews] = useState<TeacherTaskReview[]>(initialReviews ?? []);

  const [activeView, setActiveView] = useState<"overview" | "today" | "assignments" | "student" | "disciplinary" | "history" | "audit">("overview");

  // Selected Student for Persistent Tracking (Kanbann Parent Style)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchStudentInput, setSearchStudentInput] = useState("");

  // Homework View Filters
  const [viewMode, setViewMode] = useState<"board" | "list" | "category">("board");
  const [childFilter, setChildFilter] = useState<"all" | "pending" | "done">("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<HomeworkTask | null>(null);

  // Disciplinary form state
  const [isGroupMode, setIsGroupMode] = useState<boolean>(false);
  const [selectedGroupStudents, setSelectedGroupStudents] = useState<Set<string>>(new Set());
  const [penaltyStudent, setPenaltyStudent] = useState<Student | null>(null);
  const [penaltySearch, setPenaltySearch] = useState("");
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);
  const [otherBehaviorText, setOtherBehaviorText] = useState("");
  const [isWarningSelected, setIsWarningSelected] = useState<boolean>(true);
  const [selectedPokkrongLevel, setSelectedPokkrongLevel] = useState<1 | 2 | 3 | null>(null);
  const [isChoreSelected, setIsChoreSelected] = useState<boolean>(false);
  const [selectedChoreDuration, setSelectedChoreDuration] = useState<string>("1 วัน");
  const [customChoreDuration, setCustomChoreDuration] = useState<string>("");
  const [newRecordStatus, setNewRecordStatus] = useState<PenaltyRecord["status"]>("pending");
  const [newRecordNote, setNewRecordNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History search
  const [historySearch, setHistorySearch] = useState("");
  const [editingRecord, setEditingRecord] = useState<PenaltyRecord | null>(null);
  const [editIncident, setEditIncident] = useState("");
  const [editSeverity, setEditSeverity] = useState<SeverityLevel>("medium");
  const [editStatus, setEditStatus] = useState<PenaltyRecord["status"]>("pending");
  const [editNote, setEditNote] = useState("");

  // Map student completion
  const completionMap = useMemo(() => {
    const map = new Map<string, string>();
    completions.forEach((c) => {
      map.set(`${c.student_id}_${c.task_id}`, c.status);
    });
    return map;
  }, [completions]);
  const reviewedSet = useMemo(() => new Set(reviews.map((item) => `${item.student_id}_${item.task_id}`)), [reviews]);
  const pendingReviews = useMemo(() => completions.filter((item) => item.status === "done" && !reviewedSet.has(`${item.student_id}_${item.task_id}`)), [completions, reviewedSet]);

  // Tasks with student-specific status applied
  const studentActiveTasks = useMemo(() => {
    return tasks.map((t) => {
      if (!selectedStudent) return t;
      const status = completionMap.get(`${selectedStudent.student_id}_${t.id}`);
      return { ...t, status: status ?? "todo" };
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

  const openTasks = useMemo(() => tasks.filter((task) => task.status !== "done"), [tasks]);
  const upcomingTasks = useMemo(
    () => [...openTasks].sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 5),
    [openTasks]
  );
  const dueSoonCount = useMemo(
    () => openTasks.filter((task) => ["critical", "warning"].includes(getUrgency(task)?.level ?? "")).length,
    [openTasks]
  );

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

  // Helper methods for disciplinary actions
  const toggleBehavior = (label: string) => {
    setSelectedBehaviors((prev) =>
      prev.includes(label) ? prev.filter((b) => b !== label) : [...prev, label]
    );
  };

  const selectPokkrong = (level: 1 | 2 | 3) => {
    setSelectedPokkrongLevel((prev) => (prev === level ? null : level));
  };

  const toggleGroupMode = () => {
    setIsGroupMode((prev) => {
      const next = !prev;
      if (next && penaltyStudent) {
        setSelectedGroupStudents(new Set([penaltyStudent.student_id]));
      }
      return next;
    });
  };

  const toggleGroupStudent = (id: string) => {
    setSelectedGroupStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllStudentsInGroup = () => {
    setSelectedGroupStudents(new Set(students.map((s) => s.student_id)));
  };

  const clearGroupSelection = () => {
    setSelectedGroupStudents(new Set());
  };

  const getCombinedIncident = (): string => {
    const list = [...selectedBehaviors];
    if (list.includes("อื่น ๆ") && otherBehaviorText.trim()) {
      const idx = list.indexOf("อื่น ๆ");
      list[idx] = `อื่น ๆ: ${otherBehaviorText.trim()}`;
    }
    if (list.length === 0 && otherBehaviorText.trim()) {
      list.push(otherBehaviorText.trim());
    }
    return list.join(", ");
  };

  const getCombinedPunishment = (): string => {
    const parts: string[] = [];
    if (isWarningSelected) {
      parts.push("ตักเตือน");
    }
    if (selectedPokkrongLevel !== null) {
      parts.push(`ปกครอง${selectedPokkrongLevel}`);
    }
    if (isChoreSelected) {
      const dur = selectedChoreDuration === "อื่นๆ"
        ? (customChoreDuration.trim() || "อื่นๆ")
        : selectedChoreDuration;
      parts.push(`ทำเวร ${dur}`);
    }
    return parts.length > 0 ? parts.join(" + ") : "ตักเตือน";
  };

  const getSeverityLevel = (): SeverityLevel => {
    if (selectedPokkrongLevel === 3) return "strict";
    if (selectedPokkrongLevel === 2) return "high";
    if (selectedPokkrongLevel === 1) return "medium";
    if (isChoreSelected) {
      if (selectedChoreDuration === "1 ปีการศึกษา" || selectedChoreDuration === "1 เดือน") return "high";
      if (selectedChoreDuration === "1 สัปดาห์") return "medium";
      return "low";
    }
    return "low";
  };

  const getSeverityTitle = (): string => {
    if (selectedPokkrongLevel !== null) return `ปกครอง${selectedPokkrongLevel}`;
    if (isChoreSelected) {
      const dur = selectedChoreDuration === "อื่นๆ"
        ? (customChoreDuration.trim() || "อื่นๆ")
        : selectedChoreDuration;
      return `ทำเวร ${dur}`;
    }
    if (isWarningSelected) return "ตักเตือน";
    return "ตักเตือน";
  };

  const addAuditEntry = (action: string, entity: string, entityId: string, studentId: string) => {
    const newEntry: TeacherAuditEntry = {
      id: Date.now(),
      teacher_id: "teacher",
      actor_email: "ครูประจำชั้น ม.2/3",
      action,
      entity,
      entity_id: entityId,
      student_id: studentId,
      created_at: new Date().toISOString(),
    };
    setAudit((prev) => [newEntry, ...(prev ?? []).slice(0, 99)]);
  };

  // Handle Penalty Submit (Supports Single & Group Mode)
  const handlePenaltySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetStudents: Student[] = isGroupMode
      ? students.filter((s) => selectedGroupStudents.has(s.student_id))
      : penaltyStudent
      ? [penaltyStudent]
      : [];

    if (targetStudents.length === 0) {
      toast.error(isGroupMode ? "กรุณาเลือกนักเรียนในกลุ่มอย่างน้อย 1 คน!" : "กรุณาเลือกลูกศิษย์ก่อนบันทึก!");
      return;
    }

    const incident = getCombinedIncident();
    if (!incident.trim()) {
      toast.error("กรุณาเลือกพฤติกรรมหรือระบุเหตุการณ์!");
      return;
    }

    const punishment = getCombinedPunishment();
    const severity = getSeverityLevel();
    const severity_title = getSeverityTitle();

    setIsSubmitting(true);
    try {
      if (targetStudents.length === 1) {
        const s = targetStudents[0];
        const created = await createPenaltyRecord({
          student_id: s.student_id,
          student_no: s.student_no,
          student_name: `${s.prefix}${s.first_name} ${s.last_name}`,
          student_nickname: s.nickname,
          severity,
          severity_title,
          incident,
          punishment,
          status: newRecordStatus,
          follow_up_note: newRecordNote.trim() || undefined,
        });

        setRecords((prev) => [created, ...prev]);
        addAuditEntry("insert", "ohmjaa_penalties", created.id, s.student_id);
        toast.success(`บันทึกข้อมูลของ ${s.first_name} เรียบร้อยแล้ว`);
      } else {
        const items = targetStudents.map((s) => ({
          student_id: s.student_id,
          student_no: s.student_no,
          student_name: `${s.prefix}${s.first_name} ${s.last_name}`,
          student_nickname: s.nickname,
          severity,
          severity_title,
          incident,
          punishment,
          status: newRecordStatus,
          follow_up_note: newRecordNote.trim() || undefined,
        }));

        const createdList = await createPenaltyRecordsBulk(items);
        setRecords((prev) => [...createdList, ...prev]);
        createdList.forEach((c) => addAuditEntry("insert", "ohmjaa_penalties", c.id, c.student_id));
        toast.success(`บันทึกข้อมูลกลุ่มนักเรียน ${targetStudents.length} คน เรียบร้อยแล้ว`);
      }

      // Reset incident inputs
      setSelectedBehaviors([]);
      setOtherBehaviorText("");
      setNewRecordNote("");
      if (!isGroupMode) {
        setPenaltyStudent(null);
      }
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
      addAuditEntry("delete", "ohmjaa_penalties", id, "");
      toast.success("ลบรายการประวัติแล้ว");
    } catch {
      toast.error("ไม่สามารถลบรายการได้");
    }
  };

  const handleCompletionChange = async (studentId: string, taskId: string, status: TaskCompletion["status"]) => {
    try {
      const changed = await updateTaskCompletion(studentId, taskId, status);
      setCompletions((current) => [...current.filter((item) => !(item.student_id === studentId && item.task_id === taskId)), changed]);
      if (status !== "done") setReviews((current) => (current ?? []).filter((item) => !(item.student_id === studentId && item.task_id === taskId)));
      addAuditEntry("update", "student_task_completions", taskId, studentId);
      toast.success("อัปเดตสถานะงานแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกสถานะงานไม่สำเร็จ");
    }
  };

  const handleMarkReviewed = async (studentId: string, taskId: string) => {
    try {
      const review: TeacherTaskReview = {
        teacher_id: "teacher",
        student_id: studentId,
        task_id: taskId,
        reviewed_at: new Date().toISOString(),
      };
      setReviews((current) => [...(current ?? []).filter((item) => !(item.student_id === studentId && item.task_id === taskId)), review]);
      addAuditEntry("update", "teacher_task_reviews", taskId, studentId);
      toast.success("บันทึกว่าตรวจแล้ว");
    } catch (error) {
      toast.error("บันทึกการตรวจไม่สำเร็จ");
    }
  };

  const openRecordEditor = (record: PenaltyRecord) => {
    setEditingRecord(record);
    setEditIncident(record.incident);
    setEditSeverity(record.severity);
    setEditStatus(record.status);
    setEditNote(record.follow_up_note ?? "");
  };

  const saveRecordEdit = async () => {
    if (!editingRecord) return;
    try {
      const changed = await updatePenaltyRecord(editingRecord.id, {
        incident: editIncident,
        severity: editSeverity,
        status: editStatus,
        follow_up_note: editNote,
      });
      if (changed) {
        setRecords((current) => current.map((item) => (item.id === changed.id ? changed : item)));
        addAuditEntry("update", "ohmjaa_penalties", changed.id, changed.student_id);
      }
      setEditingRecord(null);
      toast.success("บันทึกการแก้ไขแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "แก้ไขบันทึกไม่สำเร็จ");
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
    toast.success("ส่งออกไฟล์ CSV แล้ว");
  };

  // Kanban columns definition
  const columns = [
    { id: "todo", title: "ต้องทำ", tasks: filteredTasks.filter((t) => t.status === "todo") },
    { id: "in_progress", title: "กำลังทำ", tasks: filteredTasks.filter((t) => t.status === "in_progress") },
    { id: "done", title: "เสร็จแล้ว", tasks: filteredTasks.filter((t) => t.status === "done") },
  ];

  return (
    <div className="min-h-screen bg-[#f5f3ef] text-[#182422] font-sans pb-24 selection:bg-[#dce9e2] selection:text-[#173d36]">
      <Toaster position="bottom-right" />

      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR (Kanbann & Primjaa Floating Pill Style)                     */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#fdfcf9]/95 backdrop-blur-md border-b border-[#e5e2db] px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#16453d] text-white flex items-center justify-center shrink-0">
              <BookOpen size={19} strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-base sm:text-lg text-[#182422] tracking-tight">
                <span>โอมจ๋า</span>
              </div>
              <p className="text-[11px] text-[#72807a] font-medium hidden sm:block">
                ห้องเรียน ม.2/3
              </p>
            </div>
          </div>

          {/* Desktop Nav Pills */}
          <nav className="hidden md:flex items-center gap-1 bg-[#eeeee9] p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveView("overview")}
              className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
                activeView === "overview"
                  ? "bg-white text-[#16453d] shadow-sm"
                  : "text-[#61706a] hover:text-[#16453d] hover:bg-white/50"
              }`}
            >
              ภาพรวม
            </button>
            <button onClick={() => setActiveView("today")} className={`px-3 py-2 rounded-md transition-colors cursor-pointer ${activeView === "today" ? "bg-white text-[#16453d] shadow-sm" : "text-[#61706a] hover:text-[#16453d]"}`}>งานวันนี้</button>
            <button
              onClick={() => setActiveView("assignments")}
              className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
                activeView === "assignments"
                  ? "bg-white text-[#16453d] shadow-sm"
                  : "text-[#61706a] hover:text-[#16453d] hover:bg-white/50"
              }`}
            >
              การบ้าน
            </button>
            <button onClick={() => setActiveView("student")} className={`px-3 py-2 rounded-md transition-colors cursor-pointer ${activeView === "student" ? "bg-white text-[#16453d] shadow-sm" : "text-[#61706a] hover:text-[#16453d]"}`}>นักเรียน</button>
            <button
              onClick={() => setActiveView("disciplinary")}
              className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
                activeView === "disciplinary"
                  ? "bg-white text-[#16453d] shadow-sm"
                  : "text-[#61706a] hover:text-[#16453d] hover:bg-white/50"
              }`}
            >
              บันทึกวินัย
            </button>
            <button
              onClick={() => setActiveView("history")}
              className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
                activeView === "history"
                  ? "bg-white text-[#16453d] shadow-sm"
                  : "text-[#61706a] hover:text-[#16453d] hover:bg-white/50"
              }`}
            >
              ประวัติ ({records.length})
            </button>
            <button onClick={() => setActiveView("audit")} className={`px-3 py-2 rounded-md transition-colors cursor-pointer ${activeView === "audit" ? "bg-white text-[#16453d] shadow-sm" : "text-[#61706a] hover:text-[#16453d]"}`}>การแก้ไข</button>
          </nav>

          {/* Actions on Navbar Right */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e5eee7] text-[#16453d] text-xs font-semibold">
              <span>ห้อง ม.2/3</span>
              <span className="opacity-40">•</span>
              <span>{students.length} คน</span>
            </div>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
              title="ส่งออกประวัติเป็นไฟล์ CSV"
            >
              <FileText size={14} className="text-slate-500" />
              <span className="hidden sm:inline">ส่งออก</span> CSV
            </button>

            <a
              href="https://primjaa.bungkii.app"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#16453d] hover:bg-[#0f352e] text-white px-4 py-2 rounded-lg transition-colors"
            >
              <span>พริมจ๋า ม.2/3</span>
              <ExternalLink size={12} className="opacity-60" />
            </a>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTAINER                                                         */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 sm:pt-10 space-y-7">

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] text-[#527568] uppercase mb-2">ห้องเรียน ม.2/3</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#182422]">
              {activeView === "overview" ? "ภาพรวมห้องเรียน" : activeView === "today" ? "งานที่ต้องจัดการวันนี้" : activeView === "assignments" ? "กระดานการบ้าน" : activeView === "student" ? "ข้อมูลนักเรียน" : activeView === "disciplinary" ? "บันทึกวินัย" : activeView === "audit" ? "ประวัติการแก้ไข" : "ประวัติบันทึก"}
            </h1>
            <p className="text-sm text-[#67736d] mt-1">
              {activeView === "overview" ? "งานที่ต้องติดตามและข้อมูลล่าสุดของห้อง ม.2/3" : activeView === "today" ? "งานใกล้กำหนดและบันทึกวินัยที่ยังไม่ปิด" : activeView === "assignments" ? "ดูผู้ที่ยังไม่ส่งและเปลี่ยนสถานะงาน" : activeView === "student" ? "การบ้านและประวัติวินัยในหน้าเดียว" : activeView === "disciplinary" ? "บันทึกเหตุการณ์และดูรายการล่าสุด" : activeView === "audit" ? "ตรวจสอบว่าใครแก้ข้อมูลและเมื่อไร" : "ค้นหาและส่งออกข้อมูลย้อนหลัง"}
            </p>
          </div>
          {activeView === "assignments" && <div className="text-sm text-[#67736d]">ทั้งหมด <span className="font-bold text-[#182422]">{tasks.length}</span> งาน</div>}
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* STUDENT IDENTIFICATION BANNER (Kanbann Parent Banner)                     */}
        {/* ------------------------------------------------------------------------- */}
        {(activeView === "assignments" || activeView === "student") && (selectedStudent ? (
          <div className="rounded-2xl p-5 sm:p-6 bg-[#173f37] text-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl bg-white/90 flex items-center justify-center shrink-0 p-2 overflow-hidden">
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
                  <h3 className="text-base sm:text-lg font-bold text-white truncate">
                    {formatStudentFullName(selectedStudent)}
                  </h3>
                  {selectedStudent.nickname && (
                    <span className="text-xs font-medium text-[#b7d3c7]">
                      ({selectedStudent.nickname})
                    </span>
                  )}
                  <span className="text-xs font-semibold text-[#b7d3c7] font-mono">
                    เลขที่ {selectedStudent.student_no}
                  </span>
                </div>
                <p className="text-xs text-[#b7d3c7] font-medium">
                  รหัสนักเรียน: <span className="font-mono">{selectedStudent.student_id}</span> • ห้อง ม.2/3
                </p>
              </div>
            </div>

            {/* Quick Metrics of this Student */}
            <div className="flex items-center gap-3 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-white/20">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#b7d3c7] font-medium">ส่งแล้ว</span>
                <span className="font-bold text-white font-mono text-sm">
                  {studentStats.done}/{studentStats.total}
                </span>
                <span className="text-[#d8e9a0] font-semibold font-mono text-xs">
                  {studentStats.progress}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="text-xs font-semibold text-[#173f37] bg-white hover:bg-[#edf2eb] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  เปลี่ยนคน
                </button>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-[#b7d3c7] hover:text-white p-1 rounded-full transition-colors cursor-pointer"
                  title="ยกเลิกการเลือก"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Prompt banner when no student is selected */
          <div className="rounded-2xl p-5 sm:p-6 bg-[#173f37] text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-12 h-12 rounded-xl bg-white/10 text-[#d8e9a0] flex items-center justify-center shrink-0">
                <Users size={22} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  เลือกนักเรียนเพื่อดูข้อมูลรายบุคคล
                </h3>
                <p className="text-xs text-[#b7d3c7] mt-0.5">
                  ค้นหาด้วยชื่อหรือเลขที่ เพื่อดูการบ้านและความคืบหน้า
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="px-4 py-2.5 rounded-lg bg-[#dce9a6] hover:bg-[#edf4c6] text-[#173f37] text-xs font-bold transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Search size={14} />
              <span>เลือกนักเรียน</span>
            </button>
          </div>
        ))}

        {activeView === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: "นักเรียน", value: students.length, detail: "คนในห้อง", icon: Users },
                { label: "งานรอตรวจ", value: pendingReviews.length, detail: "นักเรียนส่งแล้ว", icon: BookOpen },
                { label: "ต้องติดตาม", value: dueSoonCount, detail: "ใกล้ครบหรือเกินกำหนด", icon: Clock },
                { label: "วินัยรอติดตาม", value: records.filter((record) => record.status === "pending").length, detail: "เรื่องที่ยังไม่ปิด", icon: FileText },
              ].map(({ label, value, detail, icon: Icon }) => (
                <div key={label} className="rounded-xl border border-[#e5e2db] bg-[#fdfcf9] p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-semibold text-[#67736d]">{label}</span>
                    <Icon size={17} className="text-[#648879]" strokeWidth={1.8} />
                  </div>
                  <div className="mt-4 text-3xl font-bold tracking-tight text-[#182422] tabular-nums">{value}</div>
                  <p className="mt-1 text-xs text-[#7a857d]">{detail}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <section className="lg:col-span-3 rounded-xl border border-[#e5e2db] bg-[#fdfcf9] overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#e5e2db]">
                  <div>
                    <h2 className="text-sm font-bold text-[#182422]">กำหนดส่งที่ควรดู</h2>
                    <p className="text-xs text-[#7a857d] mt-0.5">เรียงจากวันที่ใกล้ที่สุด</p>
                  </div>
                  <button onClick={() => setActiveView("assignments")} className="text-xs font-semibold text-[#16453d] hover:underline cursor-pointer">ดูการบ้านทั้งหมด <ArrowRight size={13} className="inline ml-1" /></button>
                </div>
                {upcomingTasks.length ? (
                  <div className="divide-y divide-[#eeece6]">
                    {upcomingTasks.map((task) => {
                      const urgency = getUrgency(task);
                      return (
                        <button key={task.id} onClick={() => setSelectedTask(task)} className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-[#f7f7f2] transition-colors cursor-pointer">
                          <div className="w-10 h-10 rounded-lg bg-[#e8eee7] text-[#16453d] flex items-center justify-center shrink-0"><BookOpen size={17} /></div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-[#182422] truncate">{task.subject}</div>
                            <div className="text-xs text-[#7a857d] truncate">{task.details}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-semibold text-[#35453d]">{task.due_date}</div>
                            {urgency && <div className={`text-[11px] mt-0.5 ${urgency.level === "critical" ? "text-red-700" : urgency.level === "warning" ? "text-amber-700" : "text-[#7a857d]"}`}>{urgency.text}</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : <div className="px-5 py-12 text-center text-sm text-[#7a857d]">ยังไม่มีงานที่ต้องติดตาม</div>}
              </section>

              <div className="lg:col-span-2 space-y-4">
                <section className="rounded-xl border border-[#e5e2db] bg-[#fdfcf9] p-5">
                  <h2 className="text-sm font-bold text-[#182422]">ทางลัดสำหรับครู</h2>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button onClick={() => setActiveView("disciplinary")} className="rounded-lg bg-[#16453d] text-white p-3 text-left hover:bg-[#0f352e] transition-colors cursor-pointer">
                      <Gavel size={18} className="mb-3" />
                      <span className="text-xs font-semibold">เพิ่มบันทึกวินัย</span>
                    </button>
                    <button onClick={() => { setActiveView("assignments"); setIsSearchOpen(true); }} className="rounded-lg bg-[#e8eee7] text-[#16453d] p-3 text-left hover:bg-[#dce7dc] transition-colors cursor-pointer">
                      <Search size={18} className="mb-3" />
                      <span className="text-xs font-semibold">ค้นหานักเรียน</span>
                    </button>
                  </div>
                  <div className="flex gap-4 mt-4 text-xs font-semibold text-[#16453d]"><button onClick={() => setActiveView("today")} className="hover:underline cursor-pointer">งานวันนี้</button><button onClick={() => setActiveView("history")} className="hover:underline cursor-pointer">ประวัติวินัย</button><button onClick={() => setActiveView("audit")} className="hover:underline cursor-pointer">ประวัติการแก้ไข</button></div>
                </section>

                <section className="rounded-xl border border-[#e5e2db] bg-[#fdfcf9] overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e2db]">
                    <h2 className="text-sm font-bold text-[#182422]">บันทึกล่าสุด</h2>
                    <button onClick={() => setActiveView("history")} className="text-xs font-semibold text-[#16453d] hover:underline cursor-pointer">ดูทั้งหมด</button>
                  </div>
                  {records.length ? records.slice(0, 3).map((record) => (
                    <div key={record.id} className="px-5 py-3 border-b last:border-b-0 border-[#eeece6]">
                      <div className="flex justify-between gap-3 text-xs"><span className="font-semibold text-[#182422] truncate">{record.student_name}</span><span className="text-[#7a857d] shrink-0">{new Date(record.created_at).toLocaleDateString("th-TH")}</span></div>
                      <p className="text-xs text-[#7a857d] truncate mt-1">{record.incident}</p>
                    </div>
                  )) : <div className="px-5 py-8 text-center text-xs text-[#7a857d]">ยังไม่มีบันทึกวินัย</div>}
                </section>
              </div>
            </div>
          </div>
        )}

        {activeView === "today" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className="rounded-xl border border-[#e5e2db] bg-white p-5">
              <h2 className="font-bold text-[#182422]">การบ้านใกล้หรือเกินกำหนด</h2>
              <p className="text-xs text-[#7a857d] mt-1">กดที่งานเพื่อดูรายชื่อนักเรียนและอัปเดตสถานะ</p>
              <div className="mt-4 divide-y divide-[#eeece6]">
                {openTasks.filter((task) => ["critical", "warning"].includes(getUrgency(task)?.level ?? "")).map((task) => {
                  const pending = students.filter((student) => completionMap.get(`${student.student_id}_${task.id}`) !== "done").length;
                  return <button key={task.id} onClick={() => setSelectedTask(task)} className="w-full flex items-center justify-between gap-3 py-3 text-left hover:bg-[#f7f7f2] cursor-pointer">
                    <span><span className="block text-sm font-semibold">{task.subject}</span><span className="text-xs text-[#7a857d]">กำหนด {task.due_date}</span></span>
                    <span className="text-xs font-semibold text-[#9a5c2e] shrink-0">ยังไม่ส่ง {pending} คน</span>
                  </button>;
                })}
                {dueSoonCount === 0 && <p className="py-8 text-center text-sm text-[#7a857d]">ไม่มีงานใกล้กำหนด</p>}
              </div>
            </section>
            <section className="rounded-xl border border-[#e5e2db] bg-white p-5">
              <h2 className="font-bold text-[#182422]">งานที่รอตรวจ</h2>
              <p className="text-xs text-[#7a857d] mt-1">นักเรียนส่งแล้ว แต่ครูยังไม่ได้ทำเครื่องหมายว่าตรวจ</p>
              <div className="mt-4 divide-y divide-[#eeece6] max-h-[480px] overflow-y-auto">
                {pendingReviews.slice(0, 20).map((completion) => {
                  const student = students.find((item) => item.student_id === completion.student_id);
                  const task = tasks.find((item) => item.id === completion.task_id);
                  if (!student || !task) return null;
                  return <div key={`${completion.student_id}_${completion.task_id}`} className="flex items-center justify-between gap-2 py-3 text-xs">
                    <div className="min-w-0"><div className="font-semibold truncate">{student.first_name} {student.last_name}</div><div className="text-[#7a857d] truncate">{task.subject}</div></div>
                    <button onClick={() => handleMarkReviewed(student.student_id, task.id)} className="text-[#16453d] font-semibold shrink-0 hover:underline cursor-pointer">ตรวจแล้ว</button>
                  </div>;
                })}
                {!pendingReviews.length && <p className="py-8 text-center text-sm text-[#7a857d]">ไม่มีงานรอตรวจ</p>}
              </div>
            </section>
            <section className="rounded-xl border border-[#e5e2db] bg-white p-5">
              <h2 className="font-bold text-[#182422]">วินัยที่รอติดตาม</h2>
              <p className="text-xs text-[#7a857d] mt-1">บันทึกที่ยังไม่ปิดเรื่อง</p>
              <div className="mt-4 divide-y divide-[#eeece6]">
                {records.filter((record) => record.status === "pending").map((record) => <button key={record.id} onClick={() => openRecordEditor(record)} className="w-full flex items-center justify-between gap-3 py-3 text-left hover:bg-[#f7f7f2] cursor-pointer">
                  <span className="min-w-0"><span className="block text-sm font-semibold truncate">{record.student_name}</span><span className="block text-xs text-[#7a857d] truncate">{record.incident}</span></span>
                  <span className="text-xs text-[#7a857d] shrink-0">{new Date(record.created_at).toLocaleDateString("th-TH")}</span>
                </button>)}
                {!records.some((record) => record.status === "pending") && <p className="py-8 text-center text-sm text-[#7a857d]">ไม่มีเรื่องที่รอติดตาม</p>}
              </div>
            </section>
          </div>
        )}

        {activeView === "student" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#e5e2db] bg-white p-5">
              <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-bold">รายชื่อนักเรียน</h2><span className="text-xs text-[#7a857d]">{students.length} คน</span></div>
              <div className="flex flex-wrap gap-2 mt-4 max-h-40 overflow-y-auto">
                {students.map((student) => <button key={student.student_id} onClick={() => setSelectedStudent(student)} className={`px-3 py-2 rounded-lg border text-xs cursor-pointer ${selectedStudent?.student_id === student.student_id ? "bg-[#16453d] border-[#16453d] text-white" : "border-[#e5e2db] hover:border-[#8ca99a]"}`}>{student.student_no}. {student.first_name}</button>)}
              </div>
            </div>
            {selectedStudent && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className="rounded-xl border border-[#e5e2db] bg-white p-5">
                <h2 className="text-sm font-bold">การบ้าน · ส่งแล้ว {studentStats.done}/{studentStats.total}</h2>
                <div className="mt-4 divide-y divide-[#eeece6] max-h-[440px] overflow-y-auto">
                  {tasks.map((task) => <div key={task.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0"><div className="text-sm font-semibold truncate">{task.subject}</div><div className="text-xs text-[#7a857d]">กำหนด {task.due_date}</div></div>
                    <select aria-label={`สถานะงาน ${task.subject}`} value={completionMap.get(`${selectedStudent.student_id}_${task.id}`) ?? "todo"} onChange={(event) => handleCompletionChange(selectedStudent.student_id, task.id, event.target.value as TaskCompletion["status"])} className="text-xs border border-[#d9ddd5] rounded-lg p-2 bg-white cursor-pointer">
                      <option value="todo">ยังไม่ส่ง</option><option value="in_progress">กำลังทำ</option><option value="done">ส่งแล้ว</option>
                    </select>
                  </div>)}
                  {!tasks.length && <p className="py-8 text-center text-xs text-[#7a857d]">ยังไม่มีการบ้าน</p>}
                </div>
              </section>
              <section className="rounded-xl border border-[#e5e2db] bg-white p-5">
                <h2 className="text-sm font-bold">ประวัติวินัย</h2>
                <div className="mt-4 divide-y divide-[#eeece6]">
                  {records.filter((record) => record.student_id === selectedStudent.student_id).map((record) => <button key={record.id} onClick={() => openRecordEditor(record)} className="w-full py-3 text-left hover:bg-[#f7f7f2] cursor-pointer">
                    <div className="flex justify-between gap-2 text-xs"><span className="font-semibold">{record.severity_title}</span><span className="text-[#7a857d]">{record.status === "pending" ? "รอติดตาม" : record.status === "completed" ? "เสร็จสิ้น" : "ยกเว้น"}</span></div>
                    <p className="text-xs text-[#67736d] mt-1">{record.incident}</p>
                    {record.follow_up_note && <p className="text-xs text-[#7a857d] mt-1">ติดตาม: {record.follow_up_note}</p>}
                  </button>)}
                  {!records.some((record) => record.student_id === selectedStudent.student_id) && <p className="py-8 text-center text-xs text-[#7a857d]">ยังไม่มีบันทึกวินัย</p>}
                </div>
              </section>
            </div>}
          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* VIEW 1: KANBANN HOMEWORK ASSIGNMENTS BOARD                                */}
        {/* ------------------------------------------------------------------------- */}
        {activeView === "assignments" && (
          <div className="space-y-6">
            
            {/* Toolbar: Views & Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#fdfcf9] rounded-xl border border-[#e5e2db] p-3">
              
              {/* Subject filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setFilterSubject("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    filterSubject === "all"
                      ? "bg-[#16453d] text-white"
                      : "bg-[#efeee9] text-[#58665f] hover:bg-[#e4e7df]"
                  }`}
                >
                  ทุกวิชา ({tasks.length})
                </button>
                {uniqueSubjects.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setFilterSubject(sub)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      filterSubject === sub
                        ? "bg-[#16453d] text-white"
                        : "bg-[#efeee9] text-[#58665f] hover:bg-[#e4e7df]"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              {/* Status Filter when student is chosen */}
              {selectedStudent && (
                <div className="flex items-center gap-1.5 shrink-0 text-xs bg-[#efeee9] p-1 rounded-lg">
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
                      childFilter === "pending" ? "bg-[#16453d] text-white" : "text-[#58665f]"
                    }`}
                  >
                    ยังไม่ส่ง ({studentStats.pending})
                  </button>
                  <button
                    onClick={() => setChildFilter("done")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      childFilter === "done" ? "bg-[#16453d] text-white" : "text-[#58665f]"
                    }`}
                  >
                    ส่งแล้ว ({studentStats.done})
                  </button>
                </div>
              )}

            </div>

            {/* Kanban Columns (Kanbann Style) */}
            <div className="overflow-x-auto w-full pb-6">
              <div className="flex gap-4 items-stretch min-w-max lg:min-w-0">
                {columns.map((col) => (
                  <div
                    key={col.id}
                    className="bg-[#eeeee9] rounded-xl w-80 lg:w-1/3 flex flex-col border border-[#e4e2da] shrink-0 lg:shrink"
                  >
                    {/* Column Header */}
                    <div className="p-4 border-b border-[#e4e2da] flex items-center justify-between bg-[#f8f7f3] rounded-t-xl">
                      <h3 className="font-bold text-[#263b34] text-sm">{col.title}</h3>
                      <span className="text-slate-500 text-xs font-mono font-medium">
                        {col.tasks.length}
                      </span>
                    </div>

                    {/* Column Task Cards */}
                    <div className="p-3 flex-1 flex flex-col gap-2.5 min-h-[220px]">
                      {col.tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-28 text-slate-500 rounded-lg bg-white/60 mt-1">
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
                              className={`bg-[#fdfcf9] rounded-lg p-4 border transition-colors cursor-pointer hover:border-[#8ca99a] ${
                                isDone
                                  ? "border-[#c7d9cc]"
                                  : urgency?.level === "critical"
                                  ? "border-[#dfaaa0]"
                                  : "border-[#e5e2db]"
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
                                <h4 className={`font-bold text-[#182422] text-sm leading-snug ${isDone ? "text-[#78867d]" : ""}`}>
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
            
            {/* Form Column (Left 6 cols) */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#16453d] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Gavel size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      เพิ่มบันทึกวินัย
                    </h2>
                    <p className="text-xs text-slate-500">
                      ระบุพฤติกรรมและการดำเนินการ
                    </p>
                  </div>
                </div>

                {/* Mode Toggle Pill "กลุ่ม" */}
                <button
                  type="button"
                  onClick={toggleGroupMode}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                    isGroupMode
                      ? "bg-[#16453d] text-white border-[#16453d] shadow-sm ring-2 ring-[#16453d]/20"
                      : "bg-white text-slate-700 border-slate-200 hover:border-[#16453d]/40 hover:bg-slate-50"
                  }`}
                  title={isGroupMode ? "โหมดกลุ่มเปิดอยู่ (เลือกได้หลายคน)" : "เปิดโหมดเลือกเป็นกลุ่ม"}
                >
                  <Users size={15} className={isGroupMode ? "text-white" : "text-[#16453d]"} />
                  <span>กลุ่ม</span>
                  {isGroupMode && (
                    <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                  )}
                </button>
              </div>

              <form onSubmit={handlePenaltySubmit} className="space-y-5">
                {/* 1. Select Student(s) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      {isGroupMode ? "นักเรียนในกลุ่ม (เลือกได้หลายคน)" : "นักเรียน"} <span className="text-rose-600">*</span>
                    </label>
                    {isGroupMode ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={selectAllStudentsInGroup}
                          className="text-[11px] font-bold text-[#16453d] hover:underline cursor-pointer"
                        >
                          เลือกทุกคน ({students.length})
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={clearGroupSelection}
                          className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                        >
                          ล้าง ({selectedGroupStudents.size})
                        </button>
                      </div>
                    ) : (
                      penaltyStudent && (
                        <button
                          type="button"
                          onClick={() => setPenaltyStudent(null)}
                          className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                        >
                          เปลี่ยนคน
                        </button>
                      )
                    )}
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={penaltySearch}
                      onChange={(e) => setPenaltySearch(e.target.value)}
                      placeholder="พิมพ์ค้นหาชื่อ หรือเลขที่..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#16453d] focus:border-[#16453d]"
                    />
                  </div>

                  <div className="mt-2 max-h-36 overflow-y-auto border border-slate-100 rounded-xl p-1.5 bg-slate-50/50 flex flex-wrap gap-1">
                    {penaltyStudentResults.map((s) => {
                      const isSelected = isGroupMode
                        ? selectedGroupStudents.has(s.student_id)
                        : penaltyStudent?.student_id === s.student_id;
                      return (
                        <button
                          type="button"
                          key={s.student_id}
                          onClick={() => {
                            if (isGroupMode) {
                              toggleGroupStudent(s.student_id);
                            } else {
                              setPenaltyStudent(s);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1 ${
                            isSelected
                              ? "bg-[#16453d] text-white font-bold shadow-xs scale-102"
                              : "bg-white text-slate-700 border border-slate-200/90 hover:border-[#16453d]/40 hover:bg-slate-50"
                          }`}
                        >
                          <span className="font-mono text-[10px] opacity-70">#{s.student_no}</span>
                          <span>{s.first_name}</span>
                          {isSelected && <Check size={12} className="ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected summary */}
                  {isGroupMode ? (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users size={15} className="text-[#16453d]" />
                        <span className="font-bold text-[#16453d]">
                          เลือกแล้ว {selectedGroupStudents.size} คน
                        </span>
                        <span className="text-[11px] text-slate-600 truncate max-w-[220px]">
                          ({Array.from(selectedGroupStudents).map(id => {
                            const st = students.find(s => s.student_id === id);
                            return st ? `#${st.student_no} ${st.first_name}` : id;
                          }).join(", ")})
                        </span>
                      </div>
                    </div>
                  ) : penaltyStudent ? (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#16453d] text-white font-mono text-[10px] flex items-center justify-center font-bold">
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
                  ) : null}
                </div>

                {/* 2. Behaviors (Capsule Pills - Lucide Icons, White background + Dark Green contrast) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-800">
                      พฤติกรรม / เหตุการณ์ <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[11px] font-semibold text-slate-400">
                      เลือกได้มากกว่า 1 รายการ
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    {BEHAVIOR_PRESETS.map((item) => {
                      const isSelected = selectedBehaviors.includes(item.label);
                      const Icon = item.icon;
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => toggleBehavior(item.label)}
                          className={`min-h-[48px] rounded-full border px-3.5 py-2 flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                            isSelected
                              ? "bg-[#16453d] border-[#16453d] text-white shadow-md ring-2 ring-[#16453d]/20 scale-[1.01]"
                              : "bg-white border-slate-200 text-slate-800 hover:border-[#16453d]/40 hover:bg-slate-50/70 shadow-xs"
                          }`}
                        >
                          <div
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                              isSelected
                                ? "bg-white/20 border-white/30 text-white"
                                : "bg-slate-50 border-slate-200 text-[#16453d]"
                            }`}
                          >
                            <Icon size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs sm:text-sm font-bold truncate leading-tight ${isSelected ? "text-white" : "text-slate-800"}`}>
                              {item.label}
                            </div>
                            <div className={`text-[10px] truncate leading-tight mt-0.5 ${isSelected ? "text-emerald-100" : "text-slate-400"}`}>
                              {item.sub}
                            </div>
                          </div>
                          {isSelected && <Check size={14} className="text-white shrink-0 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Expandable Other Text Field */}
                  {selectedBehaviors.includes("อื่น ๆ") && (
                    <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <input
                        type="text"
                        value={otherBehaviorText}
                        onChange={(e) => setOtherBehaviorText(e.target.value)}
                        placeholder="ระบุพฤติกรรมอื่น ๆ เช่น ลุกออกจากห้อง, นำขนมมาทานในคาบ..."
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#16453d]"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {/* 3. Actions / Sanctions (เลือกตักเตือน, ทำเวร, ปกครอง1-3) */}
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">
                    การดำเนินการ: ตักเตือนเลือกเดี่ยวได้ หรือคู่กับปกครองได้ 1 ระดับ
                  </p>

                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    {/* ตักเตือน */}
                    <button
                      type="button"
                      onClick={() => setIsWarningSelected((prev) => !prev)}
                      className={`min-h-[48px] rounded-full border px-3.5 py-2 flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                        isWarningSelected
                          ? "bg-[#16453d] border-[#16453d] text-white shadow-md ring-2 ring-[#16453d]/20 scale-[1.01]"
                          : "bg-white border-slate-200 text-slate-800 hover:border-[#16453d]/40 hover:bg-slate-50/70 shadow-xs"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                          isWarningSelected
                            ? "bg-white/20 border-white/30 text-white"
                            : "bg-slate-50 border-slate-200 text-[#16453d]"
                        }`}
                      >
                        <AlertCircle size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs sm:text-sm font-bold truncate leading-tight ${isWarningSelected ? "text-white" : "text-slate-800"}`}>
                          ตักเตือน
                        </div>
                        <div className={`text-[10px] truncate leading-tight mt-0.5 ${isWarningSelected ? "text-emerald-100" : "text-slate-400"}`}>
                          เลือกเดี่ยวหรือคู่กับปกครอง
                        </div>
                      </div>
                      {isWarningSelected && <Check size={14} className="text-white shrink-0 ml-0.5" />}
                    </button>

                    {/* ทำเวร (เลือกทำเวรได้ด้วย) */}
                    <button
                      type="button"
                      onClick={() => setIsChoreSelected((prev) => !prev)}
                      className={`min-h-[48px] rounded-full border px-3.5 py-2 flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                        isChoreSelected
                          ? "bg-[#16453d] border-[#16453d] text-white shadow-md ring-2 ring-[#16453d]/20 scale-[1.01]"
                          : "bg-white border-slate-200 text-slate-800 hover:border-[#16453d]/40 hover:bg-slate-50/70 shadow-xs"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                          isChoreSelected
                            ? "bg-white/20 border-white/30 text-white"
                            : "bg-slate-50 border-slate-200 text-[#16453d]"
                        }`}
                      >
                        <Brush size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs sm:text-sm font-bold truncate leading-tight ${isChoreSelected ? "text-white" : "text-slate-800"}`}>
                          ทำเวร
                        </div>
                        <div className={`text-[10px] truncate leading-tight mt-0.5 ${isChoreSelected ? "text-emerald-100" : "text-slate-400"}`}>
                          {isChoreSelected ? selectedChoreDuration : "กดเพื่อเลือกระยะเวลา"}
                        </div>
                      </div>
                      {isChoreSelected && <Check size={14} className="text-white shrink-0 ml-0.5" />}
                    </button>

                    {/* ปกครอง1 */}
                    <button
                      type="button"
                      onClick={() => selectPokkrong(1)}
                      className={`min-h-[48px] rounded-full border px-3.5 py-2 flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                        selectedPokkrongLevel === 1
                          ? "bg-[#16453d] border-[#16453d] text-white shadow-md ring-2 ring-[#16453d]/20 scale-[1.01]"
                          : "bg-white border-slate-200 text-slate-800 hover:border-[#16453d]/40 hover:bg-slate-50/70 shadow-xs"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border font-bold text-xs sm:text-sm transition-colors ${
                          selectedPokkrongLevel === 1
                            ? "bg-white/20 border-white/30 text-white"
                            : "bg-slate-50 border-slate-200 text-[#16453d]"
                        }`}
                      >
                        1
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs sm:text-sm font-bold truncate leading-tight ${selectedPokkrongLevel === 1 ? "text-white" : "text-slate-800"}`}>
                          ปกครอง1
                        </div>
                        <div className={`text-[10px] truncate leading-tight mt-0.5 ${selectedPokkrongLevel === 1 ? "text-emerald-100" : "text-slate-400"}`}>
                          เลือกได้หนึ่งระดับ
                        </div>
                      </div>
                      {selectedPokkrongLevel === 1 && <Check size={14} className="text-white shrink-0 ml-0.5" />}
                    </button>

                    {/* ปกครอง2 */}
                    <button
                      type="button"
                      onClick={() => selectPokkrong(2)}
                      className={`min-h-[48px] rounded-full border px-3.5 py-2 flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                        selectedPokkrongLevel === 2
                          ? "bg-[#16453d] border-[#16453d] text-white shadow-md ring-2 ring-[#16453d]/20 scale-[1.01]"
                          : "bg-white border-slate-200 text-slate-800 hover:border-[#16453d]/40 hover:bg-slate-50/70 shadow-xs"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border font-bold text-xs sm:text-sm transition-colors ${
                          selectedPokkrongLevel === 2
                            ? "bg-white/20 border-white/30 text-white"
                            : "bg-slate-50 border-slate-200 text-[#16453d]"
                        }`}
                      >
                        2
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs sm:text-sm font-bold truncate leading-tight ${selectedPokkrongLevel === 2 ? "text-white" : "text-slate-800"}`}>
                          ปกครอง2
                        </div>
                        <div className={`text-[10px] truncate leading-tight mt-0.5 ${selectedPokkrongLevel === 2 ? "text-emerald-100" : "text-slate-400"}`}>
                          เลือกได้หนึ่งระดับ
                        </div>
                      </div>
                      {selectedPokkrongLevel === 2 && <Check size={14} className="text-white shrink-0 ml-0.5" />}
                    </button>

                    {/* ปกครอง3 (spans full width across 2 columns) */}
                    <button
                      type="button"
                      onClick={() => selectPokkrong(3)}
                      className={`col-span-2 min-h-[48px] rounded-full border px-3.5 py-2 flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                        selectedPokkrongLevel === 3
                          ? "bg-[#16453d] border-[#16453d] text-white shadow-md ring-2 ring-[#16453d]/20 scale-[1.01]"
                          : "bg-white border-slate-200 text-slate-800 hover:border-[#16453d]/40 hover:bg-slate-50/70 shadow-xs"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border font-bold text-xs sm:text-sm transition-colors ${
                          selectedPokkrongLevel === 3
                            ? "bg-white/20 border-white/30 text-white"
                            : "bg-slate-50 border-slate-200 text-[#16453d]"
                        }`}
                      >
                        3
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs sm:text-sm font-bold truncate leading-tight ${selectedPokkrongLevel === 3 ? "text-white" : "text-slate-800"}`}>
                          ปกครอง3
                        </div>
                        <div className={`text-[10px] truncate leading-tight mt-0.5 ${selectedPokkrongLevel === 3 ? "text-emerald-100" : "text-slate-400"}`}>
                          เลือกได้หนึ่งระดับ (ส่งต่อฝ่ายปกครอง)
                        </div>
                      </div>
                      {selectedPokkrongLevel === 3 && <Check size={14} className="text-white shrink-0 ml-0.5" />}
                    </button>
                  </div>

                  {/* Fading duration container for ทำเวร */}
                  <div
                    className={`transition-all duration-300 ease-out overflow-hidden ${
                      isChoreSelected
                        ? "opacity-100 max-h-40 mt-3 pt-3 border-t border-slate-100"
                        : "opacity-0 max-h-0 pointer-events-none"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#16453d] flex items-center gap-1.5">
                        <Brush size={13} />
                        <span>เลือกระยะเวลาทำเวร:</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {CHORE_DURATIONS.map((dur) => {
                        const isDurSelected = selectedChoreDuration === dur;
                        return (
                          <button
                            type="button"
                            key={dur}
                            onClick={() => setSelectedChoreDuration(dur)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              isDurSelected
                                ? "bg-[#16453d] text-white shadow-xs scale-102"
                                : "bg-white text-slate-700 border border-slate-200 hover:border-[#16453d]/40 hover:bg-slate-50"
                            }`}
                          >
                            {dur}
                          </button>
                        );
                      })}
                    </div>

                    {selectedChoreDuration === "อื่นๆ" && (
                      <div className="mt-2 animate-in fade-in duration-150">
                        <input
                          type="text"
                          value={customChoreDuration}
                          onChange={(e) => setCustomChoreDuration(e.target.value)}
                          placeholder="ระบุระยะเวลาทำเวร เช่น 3 วัน, 2 สัปดาห์..."
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#16453d]"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Follow-up status & Note */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="block text-xs font-bold text-slate-700">
                    สถานะ
                    <select
                      value={newRecordStatus}
                      onChange={(e) => setNewRecordStatus(e.target.value as PenaltyRecord["status"])}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                    >
                      <option value="pending">รอติดตาม</option>
                      <option value="completed">เสร็จสิ้น</option>
                      <option value="forgiven">ยกเว้น</option>
                    </select>
                  </label>
                  <label className="block text-xs font-bold text-slate-700">
                    หมายเหตุเพิ่มเติม (ถ้ามี)
                    <input
                      value={newRecordNote}
                      onChange={(e) => setNewRecordNote(e.target.value)}
                      placeholder="เช่น นัดพูดคุย, แจ้งผู้ปกครอง..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                    />
                  </label>
                </div>

                {/* 5. Live Summary Banner & Submit */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-800 space-y-2 shadow-xs">
                  <div className="text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">นักเรียน:</span>
                      <span className="font-bold text-[#16453d] truncate max-w-[220px]">
                        {isGroupMode
                          ? selectedGroupStudents.size > 0
                            ? `กลุ่ม ${selectedGroupStudents.size} คน`
                            : "ยังไม่ได้เลือก"
                          : penaltyStudent
                          ? `#${penaltyStudent.student_no} ${penaltyStudent.first_name}`
                          : "ยังไม่ได้เลือก"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">พฤติกรรม:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[220px]">
                        {selectedBehaviors.length > 0
                          ? selectedBehaviors.join(", ")
                          : "ยังไม่ได้เลือก"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <div className="text-[11px] text-slate-500 font-semibold">
                        การดำเนินการ:
                      </div>
                      <div className="text-sm font-bold text-[#16453d]">
                        {getCombinedPunishment()}
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#16453d] hover:bg-[#0f352e] text-white px-5 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 shrink-0 shadow-sm hover:shadow"
                    >
                      <Send size={14} />
                      <span>
                        {isSubmitting
                          ? "กำลังบันทึก..."
                          : isGroupMode && selectedGroupStudents.size > 1
                          ? `บันทึกกลุ่ม (${selectedGroupStudents.size} คน)`
                          : "บันทึกข้อมูล"}
                      </span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Recent Penalties Table (Right 6 cols) */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-[#182422] text-sm">
                  บันทึกล่าสุด ({records.length})
                </h3>
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
                            <button onClick={() => openRecordEditor(r)} className="px-2 py-1 text-[#16453d] hover:underline cursor-pointer">แก้ไข</button>
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
          <div className="bg-[#fdfcf9] rounded-xl border border-[#e5e2db] p-6 space-y-4">
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
                    <th className="py-2.5 px-3 font-bold">สถานะ</th>
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
                          <td className="py-2.5 px-3 text-[#58665f]">{r.status === "pending" ? "รอติดตาม" : r.status === "completed" ? "เสร็จสิ้น" : "ยกเว้น"}</td>
                          <td className="py-2.5 px-3 text-slate-700 max-w-[200px] truncate" title={r.incident}>
                            {r.incident}
                          </td>
                          <td className="py-2.5 px-3 text-rose-600 font-bold">
                            {r.punishment}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button onClick={() => openRecordEditor(r)} className="px-2 py-1 text-[#16453d] hover:underline cursor-pointer">แก้ไข</button>
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

        {activeView === "audit" && <section className="rounded-xl border border-[#e5e2db] bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e5e2db]"><h2 className="text-sm font-bold">การเปลี่ยนแปลงล่าสุด</h2><p className="text-xs text-[#7a857d] mt-1">บันทึกจากฐานข้อมูล สูงสุด 100 รายการ</p></div>
          <div className="divide-y divide-[#eeece6]">
            {audit.map((entry) => {
              const student = students.find((item) => item.student_id === entry.student_id);
              return <div key={entry.id} className="flex items-center justify-between gap-3 px-5 py-3 text-xs">
                <div><span className="font-semibold">{entry.action === "insert" ? "เพิ่ม" : entry.action === "update" ? "แก้ไข" : "ลบ"}</span> {entry.entity === "ohmjaa_penalties" ? "บันทึกวินัย" : entry.entity === "teacher_task_reviews" ? "การตรวจงาน" : "สถานะการบ้าน"} · {student ? formatStudentFullName(student) : entry.student_id}</div>
                <div className="text-[#7a857d] text-right shrink-0"><div>{new Date(entry.created_at).toLocaleString("th-TH")}</div><div>ผู้แก้ไข {entry.actor_email}</div></div>
              </div>;
            })}
            {!audit.length && <p className="px-5 py-10 text-center text-xs text-[#7a857d]">ยังไม่มีประวัติการแก้ไข</p>}
          </div>
        </section>}
      </main>

      {/* ========================================================================= */}
      {/* 3. STUDENT SEARCH MODAL (Kanbann StudentSearchModal Style)                 */}
      {/* ========================================================================= */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
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
                    setActiveView("student");
                    setIsSearchOpen(false);
                    toast.success(`เลือก ${s.first_name} แล้ว`);
                  }}
                  className="p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
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
                  <span className="text-xs font-medium text-slate-600">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
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

            <div className="border-t border-[#e5e2db] pt-4">
              <div className="flex items-center justify-between"><h4 className="text-sm font-bold">สถานะรายนักเรียน</h4><span className="text-xs text-[#7a857d]">ส่งแล้ว {students.filter((student) => completionMap.get(`${student.student_id}_${selectedTask.id}`) === "done").length}/{students.length}</span></div>
              <div className="mt-3 max-h-52 overflow-y-auto divide-y divide-[#eeece6]">
                {students.map((student) => <div key={student.student_id} className="flex items-center justify-between gap-2 py-2 text-xs">
                  <span className="truncate">{student.student_no}. {student.first_name} {student.last_name}</span>
                  <select aria-label={`สถานะงานของ ${student.first_name}`} value={completionMap.get(`${student.student_id}_${selectedTask.id}`) ?? "todo"} onChange={(event) => handleCompletionChange(student.student_id, selectedTask.id, event.target.value as TaskCompletion["status"])} className="border border-[#d9ddd5] rounded-lg px-2 py-1.5 bg-white cursor-pointer shrink-0">
                    <option value="todo">ยังไม่ส่ง</option><option value="in_progress">กำลังทำ</option><option value="done">ส่งแล้ว</option>
                  </select>
                </div>)}
              </div>
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

      {editingRecord && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-bold">แก้ไขบันทึกวินัย · {editingRecord.student_name}</h2><button onClick={() => setEditingRecord(null)} aria-label="ปิด" className="cursor-pointer"><X size={18} /></button></div>
          <label className="block text-xs font-semibold">เหตุการณ์<textarea value={editIncident} onChange={(event) => setEditIncident(event.target.value)} rows={3} className="mt-1 w-full border border-[#d9ddd5] rounded-lg p-2 text-sm" /></label>
          <label className="block text-xs font-semibold">ระดับ<select value={editSeverity} onChange={(event) => setEditSeverity(event.target.value as SeverityLevel)} className="mt-1 w-full border border-[#d9ddd5] rounded-lg p-2 text-sm bg-white">{(Object.keys(severityConfig) as SeverityLevel[]).map((level) => <option key={level} value={level}>{severityConfig[level].title}</option>)}</select></label>
          <label className="block text-xs font-semibold">สถานะ<select value={editStatus} onChange={(event) => setEditStatus(event.target.value as PenaltyRecord["status"])} className="mt-1 w-full border border-[#d9ddd5] rounded-lg p-2 text-sm bg-white"><option value="pending">รอติดตาม</option><option value="completed">เสร็จสิ้น</option><option value="forgiven">ยกเว้น</option></select></label>
          <label className="block text-xs font-semibold">หมายเหตุการติดตาม<textarea value={editNote} onChange={(event) => setEditNote(event.target.value)} rows={3} className="mt-1 w-full border border-[#d9ddd5] rounded-lg p-2 text-sm" /></label>
          <div className="flex justify-end gap-2"><button onClick={() => setEditingRecord(null)} className="px-4 py-2 text-sm cursor-pointer">ยกเลิก</button><button onClick={saveRecordEdit} className="px-4 py-2 text-sm rounded-lg bg-[#16453d] text-white cursor-pointer">บันทึกการแก้ไข</button></div>
        </div>
      </div>}

      {/* ========================================================================= */}
      {/* 5. MOBILE BOTTOM NAVIGATION (Kanbann Mobile Style)                        */}
      {/* ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#fdfcf9] border-t border-[#e5e2db] px-4 py-2 flex items-center justify-around">
        <button
          onClick={() => setActiveView("overview")}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer ${
            activeView === "overview" ? "text-[#16453d]" : "text-[#7b8980] hover:text-[#16453d]"
          }`}
        >
          <LayoutDashboard size={18} />
          <span>ภาพรวม</span>
        </button>
        <button onClick={() => setActiveView("today")} className={`flex flex-col items-center gap-1 text-[11px] font-bold cursor-pointer ${activeView === "today" ? "text-[#16453d]" : "text-[#7b8980]"}`}><Clock size={18} /><span>วันนี้</span></button>
        <button
          onClick={() => setActiveView("assignments")}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer ${
            activeView === "assignments" ? "text-[#16453d]" : "text-[#7b8980] hover:text-[#16453d]"
          }`}
        >
          <BookOpen size={18} />
          <span>การบ้าน</span>
        </button>

        <button
          onClick={() => setActiveView("student")}
          className="flex flex-col items-center gap-1 text-[11px] font-bold text-[#7b8980] hover:text-[#16453d] transition-colors cursor-pointer"
        >
          <Users size={18} />
          <span>นักเรียน</span>
        </button>

        <button
          onClick={() => setActiveView("disciplinary")}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer ${
            activeView === "disciplinary" ? "text-[#16453d]" : "text-[#7b8980] hover:text-[#16453d]"
          }`}
        >
          <Gavel size={18} />
          <span>วินัย</span>
        </button>


      </nav>

    </div>
  );
}
