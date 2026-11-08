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
  RotateCw,
  Sparkles,
  ClipboardList,
  SlidersHorizontal,
  ChevronRight,
  BarChart3,
  CheckSquare,
  Square,
  Eye,
  Edit3,
  Table as TableIcon,
  Columns as ColumnsIcon,
  HelpCircle,
  CheckCheck,
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
  deleteTaskCompletion,
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
    return { level: "critical", text: "เกินกำหนด", color: "text-rose-700 bg-rose-50 border-rose-200" };
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
    badgeBg: string;
  }
> = {
  low: {
    title: "รุนแรงน้อย",
    punishment: "ทำเวร 1 วัน",
    icon: Leaf,
    badgeBg: "bg-emerald-50 text-[#16453d] border-emerald-200",
  },
  medium: {
    title: "รุนแรงกลาง",
    punishment: "ทำเวร 1 อาทิตย์",
    icon: AlertTriangle,
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
  },
  high: {
    title: "รุนแรงมาก",
    punishment: "ทำเวร 1 เดือน",
    icon: Flame,
    badgeBg: "bg-rose-50 text-rose-800 border-rose-200",
  },
  strict: {
    title: "ปกครอง",
    punishment: "ให้ใบปกครอง & เชิญผู้ปกครอง",
    icon: ShieldAlert,
    badgeBg: "bg-purple-50 text-purple-800 border-purple-200",
  },
};

// Behaviors with Lucide icons (No emojis!)
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
}: DisciplinaryAppProps) {
  const [students] = useState<Student[]>(initialStudents);
  const [records, setRecords] = useState<PenaltyRecord[]>(initialRecords);
  const [tasks] = useState<HomeworkTask[]>(initialTasks);
  const [completions, setCompletions] = useState<TaskCompletion[]>(initialCompletions);
  const [audit, setAudit] = useState<TeacherAuditEntry[]>(initialAudit ?? []);
  const [reviews, setReviews] = useState<TeacherTaskReview[]>(initialReviews ?? []);

  // View state
  const [activeView, setActiveView] = useState<
    "overview" | "today" | "assignments" | "student" | "disciplinary" | "history" | "audit"
  >("overview");

  // Student view switch ("บันทึกข้อมูล" vs "ดูงาน/ประวัติ")
  const [studentCardTab, setStudentCardTab] = useState<"record" | "history">("record");
  const [studentFilterCategory, setStudentFilterCategory] = useState<
    "all" | "pending_homework" | "has_penalties" | "male" | "female"
  >("all");

  // Selected Student for Persistent Tracking
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchStudentInput, setSearchStudentInput] = useState("");

  // Homework View Mode ("table" | "kanban") - Matrix Table as primary per user request!
  const [assignmentViewMode, setAssignmentViewMode] = useState<"table" | "kanban">("table");
  const [tableSearchStudent, setTableSearchStudent] = useState<string>("");
  const [tableStatusFilter, setTableStatusFilter] = useState<"all" | "pending" | "done" | "in_progress">("all");
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

  // History search & filters
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | "pending" | "completed" | "forgiven">("all");
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
  const pendingReviews = useMemo(
    () => completions.filter((item) => item.status === "done" && !reviewedSet.has(`${item.student_id}_${item.task_id}`)),
    [completions, reviewedSet]
  );

  // Student active tasks
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

  // Behavior type frequency statistics
  const behaviorTypeStats = useMemo(() => {
    const counts: Record<string, number> = {
      "สายเช้า": 0,
      "สายเที่ยง": 0,
      "สายพัก 10": 0,
      "เครื่องแต่งกาย": 0,
      "ไม่ส่งงาน": 0,
      "พูดคุย": 0,
      "เล่นกีฬาในห้อง": 0,
      "อื่น ๆ": 0,
    };

    records.forEach((r) => {
      let matched = false;
      Object.keys(counts).forEach((key) => {
        if (key !== "อื่น ๆ" && r.incident.includes(key)) {
          counts[key]++;
          matched = true;
        }
      });
      if (!matched) {
        counts["อื่น ๆ"]++;
      }
    });

    return counts;
  }, [records]);

  // Action type frequency statistics
  const actionTypeStats = useMemo(() => {
    const counts = {
      warning: 0,
      chore: 0,
      pokkrong1: 0,
      pokkrong2: 0,
      pokkrong3: 0,
    };

    records.forEach((r) => {
      const p = r.punishment || "";
      if (p.includes("ตักเตือน")) counts.warning++;
      if (p.includes("ทำเวร")) counts.chore++;
      if (p.includes("ปกครอง1")) counts.pokkrong1++;
      if (p.includes("ปกครอง2")) counts.pokkrong2++;
      if (p.includes("ปกครอง3")) counts.pokkrong3++;
    });

    return counts;
  }, [records]);

  // Top students with highest penalties
  const topPenaltyStudents = useMemo(() => {
    const countMap: Record<string, { student: Student; count: number; lastIncident: string }> = {};
    records.forEach((r) => {
      const st = students.find((s) => s.student_id === r.student_id);
      if (st) {
        if (!countMap[st.student_id]) {
          countMap[st.student_id] = { student: st, count: 0, lastIncident: r.incident };
        }
        countMap[st.student_id].count++;
      }
    });

    return Object.values(countMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [records, students]);

  // Classroom completion rate
  const classroomCompletionRate = useMemo(() => {
    if (students.length === 0 || tasks.length === 0) return 0;
    const totalPossible = students.length * tasks.length;
    const totalDone = completions.filter((c) => c.status === "done").length;
    return Math.round((totalDone / totalPossible) * 100);
  }, [students, tasks, completions]);

  // Category counts for student view
  const studentCategoryCounts = useMemo(() => {
    let pendingHomework = 0;
    let hasPenalties = 0;
    let male = 0;
    let female = 0;

    students.forEach((s) => {
      if (s.prefix.includes("ด.ช.") || s.prefix.includes("นาย")) male++;
      if (s.prefix.includes("ด.ญ.") || s.prefix.includes("น.ส.")) female++;
      if (records.some((r) => r.student_id === s.student_id)) hasPenalties++;
      const doneCount = tasks.filter((t) => completionMap.get(`${s.student_id}_${t.id}`) === "done").length;
      if (doneCount < tasks.length) pendingHomework++;
    });

    return { all: students.length, pendingHomework, hasPenalties, male, female };
  }, [students, records, tasks, completionMap]);

  // Filtered classroom students for student roster
  const filteredClassroomStudents = useMemo(() => {
    const q = searchStudentInput.trim().toLowerCase();
    return students.filter((s) => {
      const matchesSearch =
        !q ||
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.student_id.includes(q) ||
        s.student_no.toString() === q ||
        (s.nickname && s.nickname.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (studentFilterCategory === "male") return s.prefix.includes("ด.ช.") || s.prefix.includes("นาย");
      if (studentFilterCategory === "female") return s.prefix.includes("ด.ญ.") || s.prefix.includes("น.ส.");
      if (studentFilterCategory === "has_penalties") {
        return records.some((r) => r.student_id === s.student_id);
      }
      if (studentFilterCategory === "pending_homework") {
        const doneCount = tasks.filter((t) => completionMap.get(`${s.student_id}_${t.id}`) === "done").length;
        return doneCount < tasks.length;
      }
      return true;
    });
  }, [students, searchStudentInput, studentFilterCategory, records, tasks, completionMap]);

  // Modal student results (ALL students selectable or searchable)
  const modalStudentResults = useMemo(() => {
    const q = searchStudentInput.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.student_id.includes(q) ||
        s.student_no.toString() === q ||
        (s.nickname && s.nickname.toLowerCase().includes(q))
    );
  }, [students, searchStudentInput]);

  // Disciplinary student results (ALL students selectable or searchable)
  const penaltyStudentResults = useMemo(() => {
    const q = penaltySearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.student_id.includes(q) ||
        s.student_no.toString() === q ||
        (s.nickname && s.nickname.toLowerCase().includes(q))
    );
  }, [students, penaltySearch]);

  // Students displayed in homework matrix table (1 to 53)
  const tableFilteredStudents = useMemo(() => {
    const q = tableSearchStudent.trim().toLowerCase();
    return students.filter((s) => {
      const matchSearch =
        !q ||
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.student_no.toString() === q ||
        (s.nickname && s.nickname.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (tableStatusFilter === "all") return true;

      const doneCount = tasks.filter((t) => completionMap.get(`${s.student_id}_${t.id}`) === "done").length;
      const inProgCount = tasks.filter((t) => completionMap.get(`${s.student_id}_${t.id}`) === "in_progress").length;

      if (tableStatusFilter === "done") return doneCount === tasks.length;
      if (tableStatusFilter === "pending") return doneCount < tasks.length;
      if (tableStatusFilter === "in_progress") return inProgCount > 0;

      return true;
    });
  }, [students, tableSearchStudent, tableStatusFilter, tasks, completionMap]);

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

  // Handle Penalty Submit (Single or Group)
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
    } catch {
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

  // Change individual task completion status
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

  // Quick Cycle Cell Status:
  // ไม่มีสี (-) ➔ เขียว (ส่งแล้ว) ➔ แดง (ค้างส่ง) ➔ เหลือง (กำลังทำ) ➔ ไม่มีสี (-)
  const handleCycleCellStatus = async (studentId: string, taskId: string) => {
    const current = completionMap.get(`${studentId}_${taskId}`);
    if (!current) {
      // Step 1: Set to 'done' (เขียว: ส่งแล้ว)
      await handleCompletionChange(studentId, taskId, "done");
    } else if (current === "done") {
      // Step 2: Set to 'todo' (แดง: ค้างส่ง)
      await handleCompletionChange(studentId, taskId, "todo");
    } else if (current === "todo") {
      // Step 3: Set to 'in_progress' (เหลือง: กำลังทำ)
      await handleCompletionChange(studentId, taskId, "in_progress");
    } else {
      // Step 4: Reset to none (ไม่มีสี: ไม่ทำอะไรทั้งนั้น)
      try {
        await deleteTaskCompletion(studentId, taskId);
        setCompletions((currentList) =>
          currentList.filter((item) => !(item.student_id === studentId && item.task_id === taskId))
        );
        addAuditEntry("delete", "student_task_completions", taskId, studentId);
        toast.success("ล้างสถานะเป็นไม่มีสีแล้ว");
      } catch {
        toast.error("ล้างสถานะไม่สำเร็จ");
      }
    }
  };

  // Batch column status setter (e.g. Mark all as Done)
  const handleBatchColumnStatus = async (taskId: string, targetStatus: "done" | "todo" | "none") => {
    const task = tasks.find((t) => t.id === taskId);
    const label = targetStatus === "done" ? "ส่งแล้วทุกคน" : targetStatus === "todo" ? "ค้างส่งทุกคน" : "ล้างสถานะทั้งหมด";
    if (!confirm(`ต้องการปรับสถานะงาน "${task?.subject}" ให้เป็น "${label}" สำหรับนักเรียนทุกคนหรือไม่?`)) return;

    try {
      const promises = students.map(async (s) => {
        if (targetStatus === "none") {
          await deleteTaskCompletion(s.student_id, taskId);
        } else {
          await updateTaskCompletion(s.student_id, taskId, targetStatus);
        }
      });
      await Promise.all(promises);

      if (targetStatus === "none") {
        setCompletions((prev) => prev.filter((c) => c.task_id !== taskId));
      } else {
        const newComps: TaskCompletion[] = students.map((s) => ({
          student_id: s.student_id,
          task_id: taskId,
          status: targetStatus,
        }));
        setCompletions((prev) => [...prev.filter((c) => c.task_id !== taskId), ...newComps]);
      }
      toast.success(`อัปเดตงาน "${task?.subject}" ให้ ${label} เรียบร้อยแล้ว`);
    } catch {
      toast.error("เกิดข้อผิดพลาดในการอัปเดตกลุ่ม");
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

  // Filtered records for History view
  const filteredHistoryRecords = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return records.filter((r) => {
      const matchSearch =
        !q ||
        r.student_name.toLowerCase().includes(q) ||
        r.incident.toLowerCase().includes(q) ||
        r.punishment.toLowerCase().includes(q) ||
        r.student_no.toString() === q ||
        r.student_id.includes(q);
      const matchStatus = historyStatusFilter === "all" || r.status === historyStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [records, historySearch, historyStatusFilter]);

  // Kanban columns definition
  const columns = [
    { id: "todo", title: "ต้องทำ", tasks: filteredTasks.filter((t) => t.status === "todo") },
    { id: "in_progress", title: "กำลังทำ", tasks: filteredTasks.filter((t) => t.status === "in_progress") },
    { id: "done", title: "เสร็จแล้ว", tasks: filteredTasks.filter((t) => t.status === "done") },
  ];

  return (
    <div className="min-h-screen bg-white text-[#151b2e] flex flex-col pb-[calc(100px+env(safe-area-inset-bottom,24px))] font-sans">
      <Toaster position="top-center" toastOptions={{ duration: 2500 }} />

      {/* ========================================================================= */}
      {/* 1. TOP HEADER & SEGMENTED CONTROLS                                        */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          
          {/* Brand Logo & Live Pill */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#16453d] text-white flex items-center justify-center shrink-0 shadow-sm">
              <BookOpen size={20} strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">โอมจ๋า</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-[#16453d] border border-emerald-200/60 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  พร้อม
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                ระบบติดตามการบ้านและวินัย ห้อง ม.2/3
              </p>
            </div>
          </div>

          {/* Segmented Switch Tabs (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 p-1 rounded-full border border-slate-200/80 text-xs font-bold shadow-inner">
            <button
              onClick={() => setActiveView("overview")}
              className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
                activeView === "overview"
                  ? "bg-[#16453d] text-white shadow-sm"
                  : "text-slate-600 hover:text-[#16453d] hover:bg-white/60"
              }`}
            >
              ภาพรวม
            </button>
            <button
              onClick={() => setActiveView("assignments")}
              className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
                activeView === "assignments"
                  ? "bg-[#16453d] text-white shadow-sm"
                  : "text-slate-600 hover:text-[#16453d] hover:bg-white/60"
              }`}
            >
              การบ้าน
            </button>
            <button
              onClick={() => setActiveView("student")}
              className={`px-3.5 py-2 rounded-full transition-all cursor-pointer ${
                activeView === "student"
                  ? "bg-[#16453d] text-white shadow-sm"
                  : "text-slate-600 hover:text-[#16453d] hover:bg-white/60"
              }`}
            >
              นักเรียน
            </button>
            <button
              onClick={() => setActiveView("disciplinary")}
              className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
                activeView === "disciplinary"
                  ? "bg-[#16453d] text-white shadow-sm"
                  : "text-slate-600 hover:text-[#16453d] hover:bg-white/60"
              }`}
            >
              วินัย
            </button>
            <button
              onClick={() => setActiveView("today")}
              className={`px-3.5 py-2 rounded-full transition-all cursor-pointer ${
                activeView === "today"
                  ? "bg-[#16453d] text-white shadow-sm"
                  : "text-slate-600 hover:text-[#16453d] hover:bg-white/60"
              }`}
            >
              งานวันนี้
            </button>
            <button
              onClick={() => setActiveView("history")}
              className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
                activeView === "history"
                  ? "bg-[#16453d] text-white shadow-sm"
                  : "text-slate-600 hover:text-[#16453d] hover:bg-white/60"
              }`}
            >
              ประวัติ
            </button>
            <button
              onClick={() => setActiveView("audit")}
              className={`px-3 py-2 rounded-full transition-all cursor-pointer ${
                activeView === "audit"
                  ? "bg-[#16453d] text-white shadow-sm"
                  : "text-slate-600 hover:text-[#16453d] hover:bg-white/60"
              }`}
            >
              การแก้ไข
            </button>
          </nav>

          {/* Quick Tools on Header Right */}
          <div className="flex items-center gap-2">
            {/* Quick Search Student Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#16453d] shadow-sm flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              title="ค้นหานักเรียน"
              aria-label="ค้นหานักเรียน"
            >
              <Search size={17} />
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-full transition-colors cursor-pointer shadow-xs"
              title="ส่งออกเป็นไฟล์ CSV"
            >
              <FileText size={14} className="text-[#16453d]" />
              <span>ส่งออก CSV</span>
            </button>

            <a
              href="https://primjaa.bungkii.app"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#16453d] hover:bg-[#0f352e] text-white px-3.5 py-2 rounded-full transition-all shadow-sm"
            >
              <span>พริมจ๋า</span>
              <ExternalLink size={12} className="opacity-70" />
            </a>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTENT AREA                                                      */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6 flex-1 w-full">

        {/* View Title & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#16453d] uppercase tracking-wider">
              <span>ห้องเรียน ม.2/3</span>
              <span>•</span>
              <span>{students.length} คน</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {activeView === "overview" && "ภาพรวมห้องเรียนและวินัย"}
              {activeView === "assignments" && "กระดานติดตามการบ้าน"}
              {activeView === "student" && "ข้อมูลและประวัตินักเรียน"}
              {activeView === "disciplinary" && "บันทึกพฤติกรรมและวินัย"}
              {activeView === "today" && "งานที่ต้องจัดการวันนี้"}
              {activeView === "history" && "รายงานและประวัติบันทึก"}
              {activeView === "audit" && "บันทึกการแก้ไขข้อมูล"}
            </h1>
          </div>

          {/* Quick Student Switch / Reset when filtered */}
          {selectedStudent && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-bold text-slate-800 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-[#16453d]"></span>
              <span>กรองข้อมูล: #{selectedStudent.student_no} {selectedStudent.first_name}</span>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                title="ล้างตัวกรอง"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* VIEW 1: OVERVIEW / DASHBOARD                                              */}
        {/* ------------------------------------------------------------------------- */}
        {activeView === "overview" && (
          <div className="space-y-6">

            {/* 4 Summary KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">บันทึกวินัยทั้งหมด</span>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#16453d] flex items-center justify-center">
                    <ShieldAlert size={16} />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-black text-slate-900 font-mono">{records.length}</div>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1">รายการที่บันทึกไว้</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">รอติดตามผล</span>
                  <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Clock size={16} />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-black text-amber-800 font-mono">
                    {records.filter((r) => r.status === "pending").length}
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1">เรื่องที่ยังไม่ปิดรายการ</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">การบ้านค้างส่ง</span>
                  <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center">
                    <FileX size={16} />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-black text-rose-700 font-mono">
                    {dueSoonCount}
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1">งานใกล้หรือเกินกำหนด</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">อัตราส่งงานทั้งห้อง</span>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#16453d] flex items-center justify-center">
                    <Trophy size={16} />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-black text-[#16453d] font-mono">
                    {classroomCompletionRate}%
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1">จากนักเรียนทั้งหมด 53 คน</p>
                </div>
              </div>
            </div>

            {/* Behavior Distribution Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Behavior Frequency Bars */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">การกระจายพฤติกรรม (Behavior Distribution)</h2>
                    <p className="text-xs text-slate-500 mt-0.5">จำแนกตามประเภทพฤติกรรมที่ถูกบันทึก</p>
                  </div>
                  <button
                    onClick={() => setActiveView("disciplinary")}
                    className="text-xs font-bold text-[#16453d] hover:underline cursor-pointer"
                  >
                    + บันทึกเพิ่ม
                  </button>
                </div>

                <div className="space-y-3 pt-2">
                  {Object.entries(behaviorTypeStats).map(([label, count]) => {
                    const maxCount = Math.max(...Object.values(behaviorTypeStats), 1);
                    const percentage = Math.round((count / maxCount) * 100);
                    return (
                      <div key={label} className="grid grid-cols-12 items-center gap-3 text-xs">
                        <span className="col-span-4 font-bold text-slate-800 truncate">{label}</span>
                        <div className="col-span-6 h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                          <div
                            className="h-full bg-[#16453d] rounded-full transition-all duration-500"
                            style={{ width: `${count > 0 ? Math.max(percentage, 8) : 0}%` }}
                          />
                        </div>
                        <span className="col-span-2 text-right font-mono font-bold text-slate-700">
                          {count} ครั้ง
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Action Distribution Summary Pills */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-500 mb-2">สรุปบทลงโทษและการดำเนินการ:</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                      ตักเตือน: {actionTypeStats.warning} ครั้ง
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#16453d] border border-emerald-200">
                      ทำเวร: {actionTypeStats.chore} ครั้ง
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
                      ปกครอง1: {actionTypeStats.pokkrong1} ครั้ง
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200">
                      ปกครอง2: {actionTypeStats.pokkrong2} ครั้ง
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-900 border border-rose-200">
                      ปกครอง3: {actionTypeStats.pokkrong3} ครั้ง
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Top Students Needing Attention */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">นักเรียนที่ต้องดูแลใกล้ชิด</h2>
                    <p className="text-xs text-slate-500 mt-0.5">มีบันทึกวินัยหรือค้างส่งมากที่สุด</p>
                  </div>
                  <button
                    onClick={() => setActiveView("student")}
                    className="text-xs font-bold text-[#16453d] hover:underline cursor-pointer"
                  >
                    ดูนักเรียนทุกคน
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {topPenaltyStudents.map(({ student, count, lastIncident }) => (
                    <div
                      key={student.student_id}
                      onClick={() => {
                        setSelectedStudent(student);
                        setActiveView("student");
                      }}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 font-mono text-xs font-bold text-slate-700 flex items-center justify-center shrink-0">
                          #{student.student_no}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {formatStudentFullName(student)}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            ล่าสุด: {lastIncident}
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                        {count} ครั้ง
                      </span>
                    </div>
                  ))}

                  {topPenaltyStudents.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400">
                      ยังไม่มีนักเรียนที่มีประวัติวินัย
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* VIEW 2: HOMEWORK TRACKING MATRIX TABLE (นักเรียน 1-53 x หัวข้อการบ้าน)    */}
        {/* ------------------------------------------------------------------------- */}
        {activeView === "assignments" && (
          <div className="space-y-5">
            
            {/* Header Toolbar: Search, Legend & View Mode Toggle */}
            <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search Student in Table */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={tableSearchStudent}
                    onChange={(e) => setTableSearchStudent(e.target.value)}
                    placeholder="ค้นหาชื่อ หรือเลขที่นักเรียน..."
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#16453d]/20 focus:border-[#16453d]"
                  />
                  {tableSearchStudent && (
                    <button
                      onClick={() => setTableSearchStudent("")}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* View Switcher: Table vs Kanban */}
                <div className="flex items-center gap-1.5">
                  <div className="bg-slate-100 p-1 rounded-full flex items-center gap-1 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setAssignmentViewMode("table")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                        assignmentViewMode === "table"
                          ? "bg-[#16453d] text-white shadow-xs"
                          : "text-slate-600 hover:text-[#16453d]"
                      }`}
                    >
                      <TableIcon size={14} />
                      <span>ตาราง</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignmentViewMode("kanban")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                        assignmentViewMode === "kanban"
                          ? "bg-[#16453d] text-white shadow-xs"
                          : "text-slate-600 hover:text-[#16453d]"
                      }`}
                    >
                      <ColumnsIcon size={14} />
                      <span>กระดาน</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Color Legend (ตรงตามข้อกำหนดเป๊ะๆ) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-500 mr-1">สัญลักษณ์สี:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-emerald-500 text-white shadow-2xs">
                    <Check size={12} strokeWidth={3} />
                    <span>เขียว: ส่งแล้ว</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-rose-500 text-white shadow-2xs">
                    <X size={12} strokeWidth={3} />
                    <span>แดง: ค้างส่ง</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-amber-400 text-amber-950 shadow-2xs">
                    <Clock size={12} strokeWidth={3} />
                    <span>เหลือง: กำลังทำ</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-500 border border-slate-200">
                    <span>ไม่มีสี (-): ไม่ทำอะไรทั้งนั้น</span>
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 font-medium">
                  * คลิกที่แต่ละช่องเพื่อเปลี่ยนสถานะได้ทันที
                </div>
              </div>

            </div>

            {/* MATRIX TABLE VIEW (Primary View) */}
            {assignmentViewMode === "table" && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[720px] relative">
                  <table className="w-full text-left text-xs border-collapse">
                    
                    {/* Table Header: Sticky Top with Task Subjects */}
                    <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md border-b border-slate-200 text-slate-700 shadow-xs">
                      <tr>
                        {/* Pinned Column: เลขที่ */}
                        <th className="py-3.5 px-2 font-mono font-black text-center w-11 min-w-[44px] shrink-0 border-r border-slate-200 bg-slate-50 sticky left-0 top-0 z-30">
                          เลขที่
                        </th>

                        {/* Pinned Column: ชื่อนักเรียน */}
                        <th className="py-3.5 px-3 sm:px-4 font-bold min-w-[130px] sm:min-w-[190px] max-w-[150px] sm:max-w-none border-r border-slate-200 bg-slate-50 sticky left-11 top-0 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.03)] truncate">
                          ชื่อ - นามสกุล
                        </th>

                        {/* Dynamic Columns: Each Homework Task */}
                        {tasks.map((task) => {
                          const doneCount = students.filter(
                            (s) => completionMap.get(`${s.student_id}_${task.id}`) === "done"
                          ).length;
                          const todoCount = students.filter(
                            (s) => completionMap.get(`${s.student_id}_${task.id}`) === "todo"
                          ).length;
                          const inProgCount = students.filter(
                            (s) => completionMap.get(`${s.student_id}_${task.id}`) === "in_progress"
                          ).length;

                          return (
                            <th key={task.id} className="py-3 px-3 min-w-[190px] border-r border-slate-200 align-top">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-slate-900 text-sm truncate">
                                    {task.subject}
                                  </span>
                                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#16453d] border border-emerald-200 shrink-0">
                                    ส่งแล้ว {doneCount}/{students.length}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 line-clamp-1 font-normal">
                                  {task.details}
                                </div>
                                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                                  <span className="flex items-center gap-1 font-mono">
                                    <Calendar size={11} /> {task.due_date}
                                  </span>
                                  {/* Quick Batch Actions */}
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleBatchColumnStatus(task.id, "done")}
                                      className="text-[10px] font-bold text-[#16453d] hover:underline cursor-pointer"
                                      title="ทำเครื่องหมายว่าส่งแล้วทุกคน"
                                    >
                                      ส่งทุกคน
                                    </button>
                                    <span>•</span>
                                    <button
                                      type="button"
                                      onClick={() => handleBatchColumnStatus(task.id, "none")}
                                      className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
                                      title="ล้างสถานะทั้งคอลัมน์"
                                    >
                                      ล้าง
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </th>
                          );
                        })}

                        {/* End Column: Summary per student */}
                        <th className="py-3.5 px-3 font-bold text-center w-28 shrink-0">
                          ส่งแล้ว/รวม
                        </th>
                      </tr>
                    </thead>

                    {/* Table Body: All Students 1 to 53 */}
                    <tbody className="divide-y divide-slate-100">
                      {tableFilteredStudents.map((s) => {
                        const doneCount = tasks.filter(
                          (t) => completionMap.get(`${s.student_id}_${t.id}`) === "done"
                        ).length;
                        const isAllDone = doneCount === tasks.length && tasks.length > 0;

                        return (
                          <tr key={s.student_id} className="hover:bg-slate-50/80 transition-colors group">
                            
                            {/* Pinned: Student No */}
                            <td className="py-2.5 px-2 font-mono font-bold text-center text-slate-700 border-r border-slate-200 bg-white group-hover:bg-slate-50 sticky left-0 z-20 w-11 min-w-[44px]">
                              #{s.student_no}
                            </td>

                            {/* Pinned: Student Name */}
                            <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-900 border-r border-slate-200 bg-white group-hover:bg-slate-50 sticky left-11 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)] truncate min-w-[130px] sm:min-w-[190px] max-w-[150px] sm:max-w-none">
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="truncate">{formatStudentFullName(s)}</span>
                                {s.nickname && (
                                  <span className="text-[11px] text-slate-400 font-normal shrink-0">
                                    ({s.nickname})
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Cells: Homework Tasks Status per Student */}
                            {tasks.map((task) => {
                              const status = completionMap.get(`${s.student_id}_${task.id}`);

                              return (
                                <td key={task.id} className="py-2 px-3 border-r border-slate-200 text-center">
                                  <div className="flex items-center justify-center">
                                    {/* Interactive Color Status Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleCycleCellStatus(s.student_id, task.id)}
                                      title="คลิกเพื่อเปลี่ยนสถานะ: ส่งแล้ว (เขียว) ⇄ ค้างส่ง (แดง) ⇄ กำลังทำ (เหลือง) ⇄ ไม่มีสี (-)"
                                      className={`min-h-[34px] w-full py-1.5 px-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                                        status === "done"
                                          ? "bg-emerald-500 text-white shadow-xs hover:bg-emerald-600"
                                          : status === "todo"
                                          ? "bg-rose-500 text-white shadow-xs hover:bg-rose-600"
                                          : status === "in_progress"
                                          ? "bg-amber-400 text-amber-950 shadow-xs hover:bg-amber-500"
                                          : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 border border-slate-200/60"
                                      }`}
                                    >
                                      {status === "done" && (
                                        <>
                                          <Check size={13} strokeWidth={3} />
                                          <span>ส่งแล้ว</span>
                                        </>
                                      )}
                                      {status === "todo" && (
                                        <>
                                          <X size={13} strokeWidth={3} />
                                          <span>ค้างส่ง</span>
                                        </>
                                      )}
                                      {status === "in_progress" && (
                                        <>
                                          <Clock size={13} strokeWidth={3} />
                                          <span>กำลังทำ</span>
                                        </>
                                      )}
                                      {!status && (
                                        <span className="font-mono text-slate-400">-</span>
                                      )}
                                    </button>
                                  </div>
                                </td>
                              );
                            })}

                            {/* Summary Progress per Student */}
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full font-mono text-xs font-bold ${
                                  isAllDone
                                    ? "bg-emerald-50 text-[#16453d] border border-emerald-200"
                                    : doneCount > 0
                                    ? "bg-slate-100 text-slate-700"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {doneCount}/{tasks.length}
                              </span>
                            </td>

                          </tr>
                        );
                      })}

                      {tableFilteredStudents.length === 0 && (
                        <tr>
                          <td colSpan={tasks.length + 3} className="py-12 text-center text-slate-400">
                            ไม่พบนักเรียนตามคำค้นหา
                          </td>
                        </tr>
                      )}
                    </tbody>

                    {/* Table Footer: Column Summary */}
                    <tfoot className="bg-slate-50/95 font-bold border-t border-slate-200 text-slate-700 sticky bottom-0 z-20 shadow-xs">
                      <tr>
                        <td className="py-3 px-2 text-center font-mono border-r border-slate-200 sticky left-0 bottom-0 z-20 bg-slate-50 w-11 min-w-[44px]">
                          รวม
                        </td>
                        <td className="py-3 px-3 sm:px-4 border-r border-slate-200 sticky left-11 bottom-0 z-20 bg-slate-50 shadow-[2px_0_5px_rgba(0,0,0,0.03)] min-w-[130px] sm:min-w-[190px] max-w-[150px] sm:max-w-none truncate">
                          สรุปภาพรวม ({students.length} คน)
                        </td>
                        {tasks.map((task) => {
                          const doneCount = students.filter(
                            (s) => completionMap.get(`${s.student_id}_${task.id}`) === "done"
                          ).length;
                          const todoCount = students.filter(
                            (s) => completionMap.get(`${s.student_id}_${task.id}`) === "todo"
                          ).length;
                          const inProgCount = students.filter(
                            (s) => completionMap.get(`${s.student_id}_${task.id}`) === "in_progress"
                          ).length;

                          return (
                            <td key={task.id} className="py-2.5 px-3 text-center border-r border-slate-200 text-[11px]">
                              <div className="flex items-center justify-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold" title="ส่งแล้ว">
                                  <CheckCircle2 size={12} strokeWidth={2.5} /> {doneCount}
                                </span>
                                <span className="inline-flex items-center gap-1 text-rose-700 font-bold" title="ค้างส่ง">
                                  <AlertCircle size={12} strokeWidth={2.5} /> {todoCount}
                                </span>
                                <span className="inline-flex items-center gap-1 text-amber-700 font-bold" title="กำลังทำ">
                                  <Clock size={12} strokeWidth={2.5} /> {inProgCount}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                        <td className="py-3 px-3 text-center font-mono text-xs text-[#16453d]">
                          {classroomCompletionRate}%
                        </td>
                      </tr>
                    </tfoot>

                  </table>
                </div>
              </div>
            )}

            {/* KANBAN BOARD VIEW (Secondary Option) */}
            {assignmentViewMode === "kanban" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {columns.map((col) => (
                    <div key={col.id} className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#16453d]" />
                          <span>{col.title}</span>
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-white border border-slate-200 text-slate-600">
                          {col.tasks.length}
                        </span>
                      </div>

                      <div className="space-y-3 min-h-[260px]">
                        {col.tasks.map((task) => {
                          const urgency = getUrgency(task);
                          const pendingCount = students.filter(
                            (s) => completionMap.get(`${s.student_id}_${task.id}`) !== "done"
                          ).length;

                          return (
                            <div
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-[#16453d]/40 transition-all cursor-pointer space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-[#16453d]">
                                  {task.subject}
                                </span>
                                {urgency && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgency.color}`}>
                                    {urgency.text}
                                  </span>
                                )}
                              </div>

                              <h4 className="font-bold text-slate-900 text-sm leading-snug">
                                {task.details}
                              </h4>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                <div className="flex items-center gap-1">
                                  <Calendar size={12} />
                                  <span>{task.due_date}</span>
                                </div>
                                <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  ยังไม่ส่ง {pendingCount} คน
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {col.tasks.length === 0 && (
                          <div className="py-12 text-center text-xs text-slate-400 bg-white/50 rounded-xl border border-dashed border-slate-200">
                            ไม่มีงานในส่วนนี้
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* VIEW 3: STUDENT DIRECTORY & PROFILE (เลือกได้ทุกคนในห้อง 1-53 หรือค้นหา)    */}
        {/* ------------------------------------------------------------------------- */}
        {activeView === "student" && (
          <div className="space-y-6">
            
            {/* Top Search & Filter Bar */}
            <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1 max-w-lg">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchStudentInput}
                    onChange={(e) => setSearchStudentInput(e.target.value)}
                    placeholder="ค้นหาชื่อ, เลขที่, หรือรหัสประจำตัว..."
                    className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#16453d]/20 focus:border-[#16453d]"
                  />
                  {searchStudentInput && (
                    <button
                      onClick={() => setSearchStudentInput("")}
                      className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Classroom Count Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-[#16453d] font-bold text-xs border border-emerald-200 shrink-0">
                  <Users size={14} />
                  <span>{students.length} คน</span>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => setStudentFilterCategory("all")}
                  className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                    studentFilterCategory === "all"
                      ? "bg-[#16453d] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  ทั้งหมด ({studentCategoryCounts.all})
                </button>
                <button
                  type="button"
                  onClick={() => setStudentFilterCategory("pending_homework")}
                  className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                    studentFilterCategory === "pending_homework"
                      ? "bg-[#16453d] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  มีงานค้าง ({studentCategoryCounts.pendingHomework})
                </button>
                <button
                  type="button"
                  onClick={() => setStudentFilterCategory("has_penalties")}
                  className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                    studentFilterCategory === "has_penalties"
                      ? "bg-[#16453d] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  มีบันทึกวินัย ({studentCategoryCounts.hasPenalties})
                </button>
                <button
                  type="button"
                  onClick={() => setStudentFilterCategory("male")}
                  className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                    studentFilterCategory === "male"
                      ? "bg-[#16453d] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  ด.ช. ชาย ({studentCategoryCounts.male})
                </button>
                <button
                  type="button"
                  onClick={() => setStudentFilterCategory("female")}
                  className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                    studentFilterCategory === "female"
                      ? "bg-[#16453d] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  ด.ญ. หญิง ({studentCategoryCounts.female})
                </button>
              </div>
            </div>

            {/* Selected Student Card Focus */}
            {selectedStudent && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                      <img
                        src={getStudentAvatar(selectedStudent)}
                        alt={selectedStudent.first_name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#16453d] text-white">
                          เลขที่ {selectedStudent.student_no}
                        </span>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900">
                          {formatStudentFullName(selectedStudent)}
                        </h2>
                        {selectedStudent.nickname && (
                          <span className="text-xs font-bold text-slate-500">
                            ({selectedStudent.nickname})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        รหัสประจำตัว: <span className="font-mono">{selectedStudent.student_id}</span> • ห้อง ม.2/3
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="self-start sm:self-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    ‹ ดูรายชื่อทุกคนในห้อง
                  </button>
                </div>

                {/* Info Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block">ห้องเรียน</span>
                    <span className="text-xs font-bold text-slate-800">ม.2/3</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block">เลขที่</span>
                    <span className="text-xs font-mono font-bold text-[#16453d]">{selectedStudent.student_no}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block">ส่งการบ้านแล้ว</span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {studentStats.done}/{studentStats.total} งาน
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block">บันทึกวินัย</span>
                    <span className="text-xs font-mono font-bold text-amber-800">
                      {records.filter((r) => r.student_id === selectedStudent.student_id).length} ครั้ง
                    </span>
                  </div>
                </div>

                {/* Subtabs Switch Control: บันทึกข้อมูล vs ดูงานและการบ้าน */}
                <div className="grid grid-cols-2 p-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setStudentCardTab("record");
                      setPenaltyStudent(selectedStudent);
                      setActiveView("disciplinary");
                    }}
                    className="py-2 rounded-full transition-all cursor-pointer bg-white text-slate-800 shadow-xs hover:text-[#16453d]"
                  >
                    + บันทึกวินัยคนนี้ทันที
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentCardTab("history")}
                    className="py-2 rounded-full transition-all cursor-pointer bg-[#16453d] text-white shadow-xs"
                  >
                    ดูงานและการบ้านของคนนี้
                  </button>
                </div>

                {/* Homework Task Status for this Student */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    สถานะการบ้านของ {selectedStudent.first_name}:
                  </h3>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                    {tasks.map((task) => {
                      const status = completionMap.get(`${selectedStudent.student_id}_${task.id}`);
                      return (
                        <div key={task.id} className="py-2.5 px-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900 mr-2">{task.subject}:</span>
                            <span className="text-slate-600">{task.details}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCycleCellStatus(selectedStudent.student_id, task.id)}
                            className={`px-3 py-1 rounded-full font-bold text-[11px] transition-all cursor-pointer ${
                              status === "done"
                                ? "bg-emerald-500 text-white"
                                : status === "todo"
                                ? "bg-rose-500 text-white"
                                : status === "in_progress"
                                ? "bg-amber-400 text-amber-950"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {status === "done" ? "✓ ส่งแล้ว" : status === "todo" ? "✕ ค้างส่ง" : status === "in_progress" ? "⏳ กำลังทำ" : "- ไม่มีสี"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* CLASSROOM ROSTER GRID: ALL STUDENTS (1-53) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    รายชื่อนักเรียนทุกคนในห้อง ม.2/3 ({filteredClassroomStudents.length} คน)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    คลิกการ์ดเพื่อดูข้อมูล หรือกด "บันทึกวินัย" เพื่อเปิดหน้าลงบันทึกทันที
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {filteredClassroomStudents.map((s) => {
                  const doneCount = tasks.filter((t) => completionMap.get(`${s.student_id}_${t.id}`) === "done").length;
                  const pendingCount = tasks.length - doneCount;
                  const penaltyCount = records.filter((r) => r.student_id === s.student_id).length;
                  const isSelected = selectedStudent?.student_id === s.student_id;

                  return (
                    <div
                      key={s.student_id}
                      className={`bg-white rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between hover:shadow-md hover:border-[#16453d]/50 ${
                        isSelected ? "border-[#16453d] ring-2 ring-[#16453d]/20 bg-emerald-50/10" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                          <img
                            src={getStudentAvatar(s)}
                            alt={s.first_name}
                            className="w-full h-full object-contain"
                          />
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#16453d] text-white">
                              เลขที่ {s.student_no}
                            </span>
                            {s.nickname && (
                              <span className="text-xs font-bold text-slate-500">
                                ({s.nickname})
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm mt-1 truncate">
                            {formatStudentFullName(s)}
                          </h3>
                          <p className="text-[11px] text-slate-400 font-mono">
                            รหัส: {s.student_id} • ม.2/3
                          </p>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold ${
                            pendingCount > 0
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-emerald-50 text-[#16453d] border border-emerald-200"
                          }`}
                        >
                          {pendingCount > 0 ? `ค้าง ${pendingCount} งาน` : "ส่งครบ"}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-full font-bold ${
                            penaltyCount > 0
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-slate-50 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {penaltyCount > 0 ? `วินัย ${penaltyCount} ครั้ง` : "วินัยปกติ"}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudent(s);
                            window.scrollTo({ top: 120, behavior: "smooth" });
                          }}
                          className="py-1.5 px-2 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>ดูข้อมูล</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPenaltyStudent(s);
                            setActiveView("disciplinary");
                          }}
                          className="py-1.5 px-2 rounded-full text-xs font-bold bg-[#16453d] hover:bg-[#0f352e] text-white transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Gavel size={13} />
                          <span>บันทึกวินัย</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredClassroomStudents.length === 0 && (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                  ไม่พบนักเรียนตามคำค้นหาหรือตัวกรองที่เลือก
                </div>
              )}
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* VIEW 4: DISCIPLINARY PENALTY FORM                                         */}
        {/* ------------------------------------------------------------------------- */}
        {activeView === "disciplinary" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Form Column (Left 6 cols) */}
            <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-5 shadow-sm">
              
              {/* Header & Group Mode Toggle Pill */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#16453d] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Gavel size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">เพิ่มบันทึกวินัย</h2>
                    <p className="text-xs text-slate-500">ระบุพฤติกรรมและการดำเนินการ</p>
                  </div>
                </div>

                {/* Capsule Group Mode Button */}
                <button
                  type="button"
                  onClick={toggleGroupMode}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                    isGroupMode
                      ? "bg-[#16453d] text-white border-[#16453d] shadow-sm ring-2 ring-[#16453d]/20 scale-105"
                      : "bg-[#dcfce7] text-[#16453d] border-[#86efac] hover:bg-[#bbf7d0] shadow-xs"
                  }`}
                  title={isGroupMode ? "โหมดกลุ่มเปิดอยู่ (คลิกเพื่อปิด)" : "เปิดโหมดเลือกเป็นกลุ่ม"}
                >
                  <Users size={16} className={isGroupMode ? "text-white" : "text-[#16453d]"} />
                  <span>กลุ่ม</span>
                  {isGroupMode && <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />}
                </button>
              </div>

              <form onSubmit={handlePenaltySubmit} className="space-y-5">
                
                {/* 1. Student Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      {isGroupMode ? "นักเรียนในกลุ่ม" : "เลือกนักเรียน"} <span className="text-rose-600">*</span>
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
                  
                  {/* Search input to filter students */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={penaltySearch}
                      onChange={(e) => setPenaltySearch(e.target.value)}
                      placeholder="พิมพ์ค้นหาชื่อ หรือเลขที่นักเรียน..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#16453d]/20 focus:border-[#16453d]"
                    />
                  </div>

                  {/* ALL Students Roster Chips (Scrollable, full classroom) */}
                  <div className="mt-2.5 max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-2 bg-slate-50/50 flex flex-wrap gap-1.5">
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
                          className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-[#16453d] text-white font-bold shadow-xs scale-102"
                              : "bg-white text-slate-700 border border-slate-200 hover:border-[#16453d]/40 hover:bg-slate-50"
                          }`}
                        >
                          <span className="font-mono text-[10px] opacity-70">#{s.student_no}</span>
                          <span>{s.first_name}</span>
                          {s.nickname && <span className="opacity-60 text-[10px]">({s.nickname})</span>}
                          {isSelected && <Check size={12} className="ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected summary */}
                  {isGroupMode ? (
                    <div className="mt-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users size={15} className="text-[#16453d]" />
                        <span className="font-bold text-[#16453d]">
                          เลือกแล้ว {selectedGroupStudents.size} คน
                        </span>
                      </div>
                    </div>
                  ) : penaltyStudent ? (
                    <div className="mt-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
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

                {/* 2. Behaviors (Capsule pills with Lucide icons) */}
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
                    <div className="mt-2.5 animate-in fade-in duration-200">
                      <input
                        type="text"
                        value={otherBehaviorText}
                        onChange={(e) => setOtherBehaviorText(e.target.value)}
                        placeholder="ระบุพฤติกรรมอื่น ๆ เช่น ลุกออกจากห้อง, นำขนมมาทานในคาบ..."
                        className="w-full px-4 py-2 text-xs bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#16453d]/20 focus:border-[#16453d]"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {/* 3. Actions / Sanctions */}
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

                    {/* ทำเวร */}
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

                    {/* ปกครอง3 */}
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
                          ส่งต่อฝ่ายปกครองพิจารณา
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
                          className="w-full px-3.5 py-1.5 text-xs bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-1 focus:ring-[#16453d]"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Note and Status */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      หมายเหตุ
                    </label>
                    <textarea
                      value={newRecordNote}
                      onChange={(e) => setNewRecordNote(e.target.value)}
                      placeholder="ระบุหมายเหตุเพิ่มเติม เช่น เข้าแถวช้า, แต่งกายไม่เรียบร้อย..."
                      rows={2}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#16453d]/20 focus:border-[#16453d]"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-slate-700 shrink-0">สถานะบันทึก:</label>
                    <select
                      value={newRecordStatus}
                      onChange={(e) => setNewRecordStatus(e.target.value as PenaltyRecord["status"])}
                      className="text-xs font-bold bg-white border border-slate-200 rounded-full px-3 py-1.5 text-slate-800 cursor-pointer"
                    >
                      <option value="pending">รอติดตามผล</option>
                      <option value="completed">เสร็จสิ้น</option>
                      <option value="forgiven">ยกเว้น</option>
                    </select>
                  </div>
                </div>

                {/* 5. Summary & Submit Action */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">นักเรียน:</span>
                      <span className="font-bold text-[#16453d] truncate max-w-[240px]">
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
                      <span className="font-bold text-slate-800 truncate max-w-[240px]">
                        {selectedBehaviors.length > 0 ? selectedBehaviors.join(", ") : "ยังไม่ได้เลือก"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">การดำเนินการ:</span>
                      <span className="font-bold text-[#16453d] truncate max-w-[240px]">
                        {getCombinedPunishment()}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-[50px] rounded-full bg-[#16453d] hover:bg-[#0f352e] text-white font-bold text-sm shadow-md shadow-[#16453d]/20 flex items-center justify-center gap-2 w-full transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    <Send size={15} />
                    <span>
                      {isSubmitting
                        ? "กำลังบันทึกข้อมูล..."
                        : isGroupMode && selectedGroupStudents.size > 1
                        ? `ส่งข้อมูลกลุ่ม (${selectedGroupStudents.size} คน)`
                        : "ส่งบันทึกข้อมูล"}
                    </span>
                  </button>
                </div>

              </form>
            </div>

            {/* Recent Penalties Table (Right 6 cols) */}
            <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm">
                  บันทึกล่าสุด ({records.length})
                </h3>
                <button
                  onClick={() => setActiveView("history")}
                  className="text-xs font-bold text-[#16453d] hover:underline cursor-pointer"
                >
                  ดูทั้งหมด
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-2 font-bold">นักเรียน</th>
                      <th className="py-2.5 px-2 font-bold">สาเหตุ</th>
                      <th className="py-2.5 px-2 font-bold">บทลงโทษ</th>
                      <th className="py-2.5 px-2 font-bold text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.slice(0, 8).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-2 font-medium text-slate-900">
                          <span className="font-mono text-[10px] text-slate-400 mr-1.5">#{r.student_no}</span>
                          {r.student_name}
                        </td>
                        <td className="py-2.5 px-2 text-slate-600 max-w-[140px] truncate" title={r.incident}>
                          {r.incident}
                        </td>
                        <td className="py-2.5 px-2 text-[#16453d] font-bold max-w-[140px] truncate">
                          {r.punishment}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <button
                            onClick={() => openRecordEditor(r)}
                            className="px-2 py-1 text-[#16453d] hover:underline cursor-pointer font-bold"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(r.id, r.student_name)}
                            className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="ลบรายการ"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-slate-400">
                          ยังไม่มีบันทึกวินัย
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
        {/* VIEW 5: TODAY (Tasks Due & Pending Penalties)                              */}
        {/* ------------------------------------------------------------------------- */}
        {activeView === "today" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Urgent Tasks */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">งานที่ต้องส่งวันนี้ / ใกล้กำหนด</h2>
                    <p className="text-xs text-slate-500">ตรวจสอบและติดตามการส่ง</p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {openTasks.filter((task) => ["critical", "warning"].includes(getUrgency(task)?.level ?? "")).map((task) => {
                  const pending = students.filter((student) => completionMap.get(`${student.student_id}_${task.id}`) !== "done").length;
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900">{task.subject}</div>
                        <div className="text-[11px] text-slate-500 truncate">{task.details}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                          ค้างส่ง {pending} คน
                        </span>
                      </div>
                    </div>
                  );
                })}

                {dueSoonCount === 0 && (
                  <div className="py-10 text-center text-xs text-slate-400">
                    ไม่มีงานใกล้หรือเกินกำหนดในขณะนี้
                  </div>
                )}
              </div>
            </div>

            {/* Pending Penalties Follow-up */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#16453d] flex items-center justify-center">
                    <ShieldAlert size={16} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">วินัยที่ยังรอติดตามผล</h2>
                    <p className="text-xs text-slate-500">ติดตามการทำเวรและการปรับพฤติกรรม</p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {records.filter((r) => r.status === "pending").slice(0, 8).map((record) => (
                  <div key={record.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900">
                        #{record.student_no} {record.student_name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {record.incident} • {record.punishment}
                      </div>
                    </div>
                    <button
                      onClick={() => openRecordEditor(record)}
                      className="px-3 py-1 rounded-full text-xs font-bold bg-[#16453d] text-white hover:bg-[#0f352e] cursor-pointer"
                    >
                      อัปเดต
                    </button>
                  </div>
                ))}

                {records.filter((r) => r.status === "pending").length === 0 && (
                  <div className="py-10 text-center text-xs text-slate-400">
                    ไม่มีรายการวินัยค้างติดตาม
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* VIEW 6: HISTORY & REPORT TABLE                                            */}
        {/* ------------------------------------------------------------------------- */}
        {activeView === "history" && (
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-sm">
            
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="ค้นหาชื่อ, เหตุการณ์, หรือบทลงโทษ..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#16453d]"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full text-xs font-bold">
                  <button
                    onClick={() => setHistoryStatusFilter("all")}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      historyStatusFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    ทั้งหมด ({records.length})
                  </button>
                  <button
                    onClick={() => setHistoryStatusFilter("pending")}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      historyStatusFilter === "pending" ? "bg-[#16453d] text-white shadow-xs" : "text-slate-600"
                    }`}
                  >
                    รอติดตาม
                  </button>
                  <button
                    onClick={() => setHistoryStatusFilter("completed")}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      historyStatusFilter === "completed" ? "bg-[#16453d] text-white shadow-xs" : "text-slate-600"
                    }`}
                  >
                    เสร็จสิ้น
                  </button>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#16453d] text-white px-4 py-2 rounded-full hover:bg-[#0f352e] transition-all cursor-pointer shadow-xs"
                >
                  <FileText size={14} />
                  <span>ส่งออก CSV</span>
                </button>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3 font-bold">เลขที่ / ชื่อ</th>
                    <th className="py-3 px-3 font-bold">เหตุการณ์</th>
                    <th className="py-3 px-3 font-bold">การดำเนินการ</th>
                    <th className="py-3 px-3 font-bold">สถานะ</th>
                    <th className="py-3 px-3 font-bold">วันที่</th>
                    <th className="py-3 px-3 font-bold text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistoryRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        <span className="font-mono text-slate-400 mr-1.5">#{r.student_no}</span>
                        {r.student_name}
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-[200px] truncate" title={r.incident}>
                        {r.incident}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#16453d] max-w-[180px] truncate">
                        {r.punishment}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            r.status === "completed"
                              ? "bg-emerald-50 text-[#16453d] border-emerald-200"
                              : r.status === "forgiven"
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {r.status === "completed" ? "เสร็จสิ้น" : r.status === "forgiven" ? "ยกเว้น" : "รอติดตาม"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                        {new Date(r.created_at).toLocaleDateString("th-TH")}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => openRecordEditor(r)}
                          className="px-2 py-1 text-[#16453d] hover:underline font-bold cursor-pointer"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(r.id, r.student_name)}
                          className="p-1 rounded-full text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="ลบ"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredHistoryRecords.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        ไม่พบข้อมูลตามตัวกรอง
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* VIEW 7: AUDIT LOG                                                         */}
        {/* ------------------------------------------------------------------------- */}
        {activeView === "audit" && (
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">บันทึกการแก้ไขข้อมูลล่าสุด (Audit Log)</h2>
              <p className="text-xs text-slate-500 mt-0.5">ประวัติการเพิ่ม แก้ไข หรือลบข้อมูลในระบบ</p>
            </div>

            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {audit.map((entry) => (
                <div key={entry.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 mr-2">[{entry.action.toUpperCase()}]</span>
                    <span className="text-slate-600 font-mono">{entry.entity}</span>
                    <span className="text-slate-400 ml-2">โดย {entry.actor_email}</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {new Date(entry.created_at).toLocaleString("th-TH")}
                  </span>
                </div>
              ))}
              {audit.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  ยังไม่มีประวัติการแก้ไขในรอบนี้
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* 3. MODALS (Task Details, Record Editor, Search Student)                   */}
      {/* ========================================================================= */}

      {/* Task Per-Student Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-[#16453d]">
                  {selectedTask.subject}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedTask.details}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-800">
                  สถานะการส่งรายบุคคล ({students.filter((s) => completionMap.get(`${s.student_id}_${selectedTask.id}`) === "done").length}/{students.length} ส่งแล้ว)
                </h4>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 pr-1">
                {students.map((s) => {
                  const status = completionMap.get(`${s.student_id}_${selectedTask.id}`) ?? "todo";
                  return (
                    <div key={s.student_id} className="py-2 flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-slate-800 truncate">
                        #{s.student_no} {s.first_name} {s.last_name}
                      </span>
                      <select
                        value={status}
                        onChange={(e) =>
                          handleCompletionChange(s.student_id, selectedTask.id, e.target.value as TaskCompletion["status"])
                        }
                        className={`text-xs font-bold rounded-full px-3 py-1 border cursor-pointer ${
                          status === "done"
                            ? "bg-emerald-50 text-[#16453d] border-emerald-200"
                            : status === "in_progress"
                            ? "bg-amber-50 text-amber-900 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        <option value="todo">ค้างส่ง</option>
                        <option value="in_progress">กำลังทำ</option>
                        <option value="done">ส่งแล้ว</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-5 py-2 rounded-full bg-[#16453d] hover:bg-[#0f352e] text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Editor Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-900 text-sm">
                แก้ไขบันทึกวินัย · {editingRecord.student_name}
              </h2>
              <button onClick={() => setEditingRecord(null)} className="cursor-pointer text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <label className="block text-xs font-bold text-slate-800">
              เหตุการณ์
              <textarea
                value={editIncident}
                onChange={(e) => setEditIncident(e.target.value)}
                rows={3}
                className="mt-1 w-full border border-slate-200 rounded-2xl p-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#16453d]"
              />
            </label>

            <label className="block text-xs font-bold text-slate-800">
              สถานะ
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as PenaltyRecord["status"])}
                className="mt-1 w-full border border-slate-200 rounded-full px-3 py-2 text-xs bg-white font-bold cursor-pointer"
              >
                <option value="pending">รอติดตาม</option>
                <option value="completed">เสร็จสิ้น</option>
                <option value="forgiven">ยกเว้น</option>
              </select>
            </label>

            <label className="block text-xs font-bold text-slate-800">
              หมายเหตุการติดตาม
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={2}
                className="mt-1 w-full border border-slate-200 rounded-2xl p-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#16453d]"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveRecordEdit}
                className="px-5 py-2 text-xs font-bold rounded-full bg-[#16453d] text-white hover:bg-[#0f352e] cursor-pointer shadow-sm"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Student Search Modal (ALL 53 students selectable or searchable) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">ค้นหานักเรียน</h3>
                <p className="text-[11px] text-slate-500">เลือกนักเรียนเพื่อดูข้อมูลหรือบันทึกวินัย</p>
              </div>
              <button onClick={() => setIsSearchOpen(false)} className="cursor-pointer text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchStudentInput}
                onChange={(e) => setSearchStudentInput(e.target.value)}
                placeholder="ค้นหาชื่อ เลขประจำตัว หรือเลขที่..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#16453d]"
                autoFocus
              />
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 pr-1">
              {modalStudentResults.map((s) => (
                <button
                  key={s.student_id}
                  onClick={() => {
                    setSelectedStudent(s);
                    setPenaltyStudent(s);
                    setIsSearchOpen(false);
                    toast.success(`เลือก ${s.first_name} แล้ว`);
                  }}
                  className="w-full text-left py-2.5 px-2 rounded-xl hover:bg-slate-50 flex items-center justify-between text-xs transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-slate-100 font-mono text-[11px] font-bold flex items-center justify-center text-slate-700">
                      #{s.student_no}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900">{formatStudentFullName(s)}</span>
                      {s.nickname && <span className="text-slate-400 text-[11px] ml-1">({s.nickname})</span>}
                    </div>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px]">{s.student_id}</span>
                </button>
              ))}
              {modalStudentResults.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400">ไม่พบนักเรียนตามคำค้นหา</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. FLOATING BOTTOM PILL NAVIGATION (iPhone & Mobile Optimized)            */}
      {/* ========================================================================= */}
      <nav
        className="fixed bottom-[calc(10px+env(safe-area-inset-bottom,8px))] left-1/2 -translate-x-1/2 z-50 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl px-2 sm:px-3 py-1.5 flex items-center gap-1 sm:gap-2 max-w-[calc(100vw-20px)] overflow-x-auto custom-scrollbar"
        aria-label="เมนูหลัก"
      >
        <button
          onClick={() => setActiveView("overview")}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeView === "overview"
              ? "bg-[#16453d] text-white shadow-xs"
              : "text-slate-600 hover:text-[#16453d]"
          }`}
        >
          <LayoutDashboard size={15} />
          <span>ภาพรวม</span>
        </button>

        <button
          onClick={() => setActiveView("assignments")}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeView === "assignments"
              ? "bg-[#16453d] text-white shadow-xs"
              : "text-slate-600 hover:text-[#16453d]"
          }`}
        >
          <BookOpen size={15} />
          <span>การบ้าน</span>
        </button>

        <button
          onClick={() => setActiveView("student")}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeView === "student"
              ? "bg-[#16453d] text-white shadow-xs"
              : "text-slate-600 hover:text-[#16453d]"
          }`}
        >
          <UserCheck size={15} />
          <span>นักเรียน</span>
        </button>

        <button
          onClick={() => setActiveView("disciplinary")}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeView === "disciplinary"
              ? "bg-[#16453d] text-white shadow-xs"
              : "text-slate-600 hover:text-[#16453d]"
          }`}
        >
          <Gavel size={15} />
          <span>วินัย</span>
        </button>

        <button
          onClick={() => setActiveView("history")}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeView === "history"
              ? "bg-[#16453d] text-white shadow-xs"
              : "text-slate-600 hover:text-[#16453d]"
          }`}
        >
          <FileText size={15} />
          <span>ประวัติ</span>
        </button>
      </nav>

    </div>
  );
}
