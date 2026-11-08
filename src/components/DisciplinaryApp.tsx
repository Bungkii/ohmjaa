"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Users,
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
  Table,
  Download,
  Printer,
  Shuffle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { Description, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { Student, PenaltyRecord, SeverityLevel } from "@/types/penalty";
import { motion, AnimatePresence } from "framer-motion";
import ActivitiesAndGrouping from "./ActivitiesAndGrouping";
import { getChoreSchedule, parseHolidayDates } from "@/lib/choreSchedule";
import {
  createPenaltyRecord,
  createPenaltyRecordsBulk,
  deletePenaltyRecord,
  updatePenaltyRecord,
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

interface DisciplinaryAppProps {
  initialStudents: Student[];
  initialRecords: PenaltyRecord[];
  initialWeeklyDuty?: Record<string, string>;
  initialAudit?: TeacherAuditEntry[];
  teacherEmail?: string;
}

export function formatStudentFullName(student: Student): string {
  const prefix = student.prefix === "ด.ญ." ? "เด็กหญิง" : student.prefix === "ด.ช." ? "เด็กชาย" : student.prefix;
  return `${prefix}${student.first_name} ${student.last_name}`;
}

export function getStudentAvatar(student: Student): string {
  return student.prefix === "ด.ญ." ? "/student-girl.webp" : "/student-boy.webp";
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

// Behaviors requested by user with Lucide icons (No emojis!)
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

const CHORE_DURATIONS = ["+1 วัน", "+1 สัปดาห์", "+1 เดือน", "1 เทอม", "1 ปีการศึกษา", "อื่นๆ"];

export default function DisciplinaryApp({
  initialStudents,
  initialRecords,
  initialWeeklyDuty = {},
  initialAudit,
}: DisciplinaryAppProps) {
  const [students] = useState<Student[]>(initialStudents);
  const [records, setRecords] = useState<PenaltyRecord[]>(initialRecords);
  const [audit, setAudit] = useState<TeacherAuditEntry[]>(initialAudit ?? []);

  // View state
  const [activeView, setActiveView] = useState<
    "overview" | "today" | "student" | "activities" | "disciplinary" | "history" | "audit"
  >("overview");

  // Selected Student for Persistent Tracking
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchStudentInput, setSearchStudentInput] = useState("");

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
  const [selectedChoreDuration, setSelectedChoreDuration] = useState<string>("+1 วัน");
  const [customChoreDuration, setCustomChoreDuration] = useState<string>("");
  const [newRecordStatus, setNewRecordStatus] = useState<PenaltyRecord["status"]>("pending");
  const [newRecordNote, setNewRecordNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History search & filters
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | "pending" | "completed" | "forgiven">("all");
  const [editingRecord, setEditingRecord] = useState<PenaltyRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editIncident, setEditIncident] = useState("");
  const [editSeverity, setEditSeverity] = useState<SeverityLevel>("medium");
  const [editStatus, setEditStatus] = useState<PenaltyRecord["status"]>("pending");
  const [editNote, setEditNote] = useState("");

  // Report Generator States (Matching html/report.html and Images 2, 3, 4)
  const [reportMode, setReportMode] = useState<"person" | "room">("person");
  const [reportStudentId, setReportStudentId] = useState<string>(students[0]?.student_id || "30233");
  const [reportStudentSearch, setReportStudentSearch] = useState<string>("");
  const [reportNote, setReportNote] = useState<string>("");
  const [schoolHolidays, setSchoolHolidays] = useState<string>("");
  const [holidaysLoaded, setHolidaysLoaded] = useState(false);
  const weeklyDuty = initialWeeklyDuty;
  const [isNoteSectionOpen, setIsNoteSectionOpen] = useState<boolean>(false);
  const [isFieldsSectionOpen, setIsFieldsSectionOpen] = useState<boolean>(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const reportPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSchoolHolidays(localStorage.getItem("ohmjaa_school_holidays") ?? "");
    setHolidaysLoaded(true);
  }, []);

  useEffect(() => {
    if (!holidaysLoaded) return;
    if (schoolHolidays) localStorage.setItem("ohmjaa_school_holidays", schoolHolidays);
    else localStorage.removeItem("ohmjaa_school_holidays");
  }, [schoolHolidays, holidaysLoaded]);


  const formatThaiShortDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        const monthIdx = parseInt(parts[1], 10) - 1;
        const thMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        return `${day} ${thMonths[monthIdx] || ""}`;
      }
      const d = new Date(dateStr);
      const thMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
      return `${d.getDate()} ${thMonths[d.getMonth()]}`;
    } catch {
      return dateStr;
    }
  };

  const formatThaiFullDate = (date: Date | string) => {
    try {
      const d = typeof date === "string" ? new Date(date) : date;
      const day = d.getDate();
      const months = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
      ];
      const month = months[d.getMonth()];
      const year = d.getFullYear() + 543;
      return `${day} ${month} ${year}`;
    } catch {
      return String(date);
    }
  };

  const currentReportStudent = useMemo(() => {
    return students.find((s) => s.student_id === reportStudentId) || students[0] || null;
  }, [students, reportStudentId]);

  const reportStudentSearchResults = useMemo(() => {
    const q = reportStudentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.student_no.toString() === q ||
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        (s.nickname && s.nickname.toLowerCase().includes(q))
    );
  }, [students, reportStudentSearch]);

  const studentReportRecords = useMemo(() => {
    if (reportMode === "room") {
      return records;
    }
    if (!currentReportStudent) return [];
    return records.filter((r) => r.student_id === currentReportStudent.student_id);
  }, [records, reportMode, currentReportStudent]);

  const groupedStudentRecords = useMemo(() => {
    const groups: Record<string, PenaltyRecord[]> = {};
    studentReportRecords.forEach((r) => {
      const key = r.incident || "บันทึกวินัย";
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  }, [studentReportRecords]);

  const choreSummary = useMemo(() => {
    const holidays = parseHolidayDates(schoolHolidays);
    const byStudent = new Map<string, { name: string; no: number; days: number; start: string; end: string | null; uncounted: number }>();
    for (const record of studentReportRecords) {
      if (record.status === "forgiven") continue;
      const schedule = getChoreSchedule(record, holidays);
      if (!schedule) continue;
      const current = byStudent.get(record.student_id) ?? {
        name: record.student_name, no: record.student_no, days: 0,
        start: schedule.start, end: null, uncounted: 0,
      };
      current.days += schedule.days ?? 0;
      if (schedule.days === null) current.uncounted++;
      if (schedule.start < current.start) current.start = schedule.start;
      if (schedule.end && (!current.end || schedule.end > current.end)) current.end = schedule.end;
      byStudent.set(record.student_id, current);
    }
    return [...byStudent.values()].sort((a, b) => a.no - b.no);
  }, [studentReportRecords, schoolHolidays]);

  const studentChoreLookup = useMemo(() => {
    const holidays = parseHolidayDates(schoolHolidays);
    const lookup = new Map<string, { days: number; unknown: number; end: string | null }>();
    for (const record of records) {
      if (record.status === "forgiven") continue;
      const schedule = getChoreSchedule(record, holidays);
      if (!schedule) continue;
      const current = lookup.get(record.student_id) ?? { days: 0, unknown: 0, end: null };
      current.days += schedule.days ?? 0;
      if (schedule.days === null) current.unknown++;
      if (schedule.end && (!current.end || schedule.end > current.end)) current.end = schedule.end;
      lookup.set(record.student_id, current);
    }
    return lookup;
  }, [records, schoolHolidays]);

  const formatChoreWeeks = (days: number) => {
    const weeks = Math.floor(days / 5);
    const remaining = days % 5;
    return [weeks ? `${weeks} สัปดาห์` : "", remaining ? `${remaining} วัน` : ""].filter(Boolean).join(" ") || "0 วัน";
  };

  const handleGenerateReport = async () => {
    setIsGeneratingDoc(true);
    await new Promise((r) => setTimeout(r, 350));
    setIsGeneratingDoc(false);
    setIsPreviewModalOpen(true);
  };

  const handlePrintReport = () => {
    if (!reportPrintRef.current) return;

    const printLayer = document.createElement("div");
    printLayer.className = "report-print-layer";
    printLayer.appendChild(reportPrintRef.current.cloneNode(true));
    document.body.appendChild(printLayer);

    const cleanup = () => {
      printLayer.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  };

  // Behavior type frequency statistics (matching html/dashboard.html)
  const behaviorTypeStats = useMemo(() => {
    const counts: Record<string, number> = {
      "สายเช้า": 0,
      "สายเที่ยง": 0,
      "สายพัก 10": 0,
      "เครื่องแต่งกาย": 0,
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

  // Action type frequency statistics (matching html/dashboard.html)
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

  // Students with highest penalties
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

  // Disciplinary student search results
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
      if (
        selectedChoreDuration === "1 ปีการศึกษา" ||
        selectedChoreDuration === "1 เทอม" ||
        selectedChoreDuration === "+1 เดือน" ||
        selectedChoreDuration === "1 เดือน"
      ) {
        return "high";
      }
      if (selectedChoreDuration === "+1 สัปดาห์" || selectedChoreDuration === "1 สัปดาห์") return "medium";
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
    } catch {
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Record
  const handleDeleteRecord = async () => {
    if (!pendingDelete || isDeleting) return;
    const { id } = pendingDelete;
    setDeletingId(id);
    setIsDeleting(true);
    try {
      await deletePenaltyRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      addAuditEntry("delete", "ohmjaa_penalties", id, "");
      toast.success("ลบรายการประวัติแล้ว");
      setPendingDelete(null);
    } catch {
      toast.error("ไม่สามารถลบรายการได้");
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
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

  return (
    <div className="min-h-screen bg-[#f7faf8] text-[#151b2e] flex flex-col pb-[calc(96px+env(safe-area-inset-bottom,16px))] lg:pb-0">
      <Toaster position="top-center" toastOptions={{ duration: 2500 }} />

      {/* ========================================================================= */}
      {/* 1. TOP HEADER & SEGMENTED CONTROLS (html/index.html & dashboard.html)    */}
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
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                ระบบบันทึกและติดตามวินัย ห้อง ม.2/3 ({students.length} คน)
              </p>
            </div>
          </div>

          {/* Segmented Switch Tabs (Desktop) */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 bg-slate-100/90 p-1 rounded-full border border-slate-200/80 text-xs font-bold shadow-inner" aria-label="เมนูหลักบนคอมพิวเตอร์">
            <button
              onClick={() => setActiveView("overview")}
              className={`px-2 xl:px-4 py-2 rounded-full transition-all cursor-pointer ${
                activeView === "overview"
                  ? "bg-[#16453d] text-white shadow-sm"
                  : "text-slate-600 hover:text-[#16453d] hover:bg-white/60"
              }`}
            >
              ภาพรวม
            </button>
            <button
              onClick={() => setActiveView("today")}
              className={`px-2 xl:px-3.5 py-2 rounded-full transition-all cursor-pointer ${
                activeView === "today"
                  ? "bg-[#16453d] text-white shadow-sm"
                  : "text-slate-600 hover:text-[#16453d] hover:bg-white/60"
              }`}
            >
              ติดตามวินัย
            </button>

            <button
              onClick={() => setActiveView("student")}
              className={`px-2 xl:px-3.5 py-2 rounded-full transition-all cursor-pointer ${
                activeView === "student"
                  ? "bg-[#16453d] text-white shadow-sm"
                  : "text-slate-600 hover:text-[#16453d] hover:bg-white/60"
              }`}
            >
              นักเรียน
            </button>
            <button
              onClick={() => setActiveView("activities")}
              className={`px-2 xl:px-3 py-2 rounded-full transition-all cursor-pointer ${
                activeView === "activities"
                  ? "bg-[#16453d] text-white shadow-sm"
                  : "text-slate-600 hover:text-[#16453d] hover:bg-white/60"
              }`}
            >
              กิจกรรม & สุ่มกลุ่ม
            </button>
            <button
              onClick={() => setActiveView("disciplinary")}
              className={`px-2 xl:px-4 py-2 rounded-full transition-all cursor-pointer ${
                activeView === "disciplinary"
                  ? "bg-[#16453d] text-white shadow-sm"
                  : "text-slate-600 hover:text-[#16453d] hover:bg-white/60"
              }`}
            >
              บันทึกวินัย
            </button>
            <button
              onClick={() => setActiveView("history")}
              className={`px-2 xl:px-4 py-2 rounded-full transition-all cursor-pointer ${
                activeView === "history"
                  ? "bg-[#16453d] text-white shadow-sm"
                  : "text-slate-600 hover:text-[#16453d] hover:bg-white/60"
              }`}
            >
              ประวัติ ({records.length})
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 pb-8 space-y-6 flex-1 w-full">

        {/* View Title & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#16453d] uppercase tracking-wider">
              <span>ห้องเรียน ม.2/3</span>
              <span>•</span>
              <span>ภาคเรียนปัจจุบัน</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {activeView === "overview" && "ภาพรวมห้องเรียนและวินัย"}
              {activeView === "today" && "วินัยที่ต้องติดตาม"}
              {activeView === "student" && "ข้อมูลและประวัตินักเรียน"}
              {activeView === "activities" && "กิจกรรมพิเศษ & สุ่มจัดกลุ่ม"}
              {activeView === "disciplinary" && "บันทึกพฤติกรรมและวินัย"}
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
        {/* VIEW 1: OVERVIEW / DASHBOARD (Modeled on html/dashboard.html)              */}
        {/* ------------------------------------------------------------------------- */}
        {activeView === "overview" && (
          <div className="space-y-6">

            <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-[#e9f5ee] via-white to-[#f7faf8] p-5 sm:p-7 shadow-sm" aria-label="เริ่มติดตามวินัย">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#16453d] border border-emerald-100"><Sparkles size={14} /> สำหรับคุณครู</div>
                  <h2 className="mt-3 text-xl sm:text-2xl font-black text-[#16453d]">เริ่มดูแลห้องเรียนวันนี้</h2>
                  <p className="mt-1 text-sm text-slate-600">เลือกบันทึกที่ต้องติดตาม หรือค้นหานักเรียนเพื่อดูข้อมูลรายคน</p>
                </div>
                <div className="grid grid-cols-2 sm:flex gap-2 shrink-0">
                  <button onClick={() => setActiveView("today")} className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-[#16453d] shadow-sm hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16453d]"><CalendarDays size={17} /> ติดตามวินัย</button>
                  <button onClick={() => setIsSearchOpen(true)} className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-[#16453d] shadow-sm hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16453d]"><Search size={17} /> ค้นหานักเรียน</button>
                  <button onClick={() => setActiveView("activities")} className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-[#16453d] shadow-sm hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16453d]"><Shuffle size={17} /> สุ่มกลุ่ม/เสื้อ</button>
                  <button onClick={() => setActiveView("disciplinary")} className="col-span-2 min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-[#16453d] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0f352e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16453d]"><PlusCircle size={17} /> เพิ่มบันทึก</button>
                </div>
              </div>
            </section>

            {/* 2 Summary KPI Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
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

            </div>

            {/* Behavior Distribution Breakdown (html/dashboard.html style) */}
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
                    <p className="text-xs text-slate-500 mt-0.5">มีบันทึกวินัยมากที่สุด</p>
                  </div>
                  <button
                    onClick={() => setActiveView("student")}
                    className="text-xs font-bold text-[#16453d] hover:underline cursor-pointer"
                  >
                    ดูทุกคน
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {topPenaltyStudents.map(({ student, count, lastIncident }, idx) => (
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
        {/* VIEW 2: DISCIPLINARY FOLLOW-UP                              */}
        {/* ------------------------------------------------------------------------- */}
        {activeView === "today" && (
          <div className="max-w-3xl mx-auto">
            
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
        {/* VIEW 4: STUDENT PROFILE (Modeled on html/index.html .student-card)          */}
        {/* ------------------------------------------------------------------------- */}
        {activeView === "student" && (
          <div className="max-w-2xl mx-auto space-y-5">
            
            {/* Search Input Bar */}
            <div className="relative">
              <div className="flex items-center bg-white border border-slate-200 rounded-full shadow-xs px-4 py-2 gap-2">
                <Search size={18} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchStudentInput}
                  onChange={(e) => setSearchStudentInput(e.target.value)}
                  placeholder="พิมพ์เลขประจำตัว ชื่อ หรือเลขที่..."
                  className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                />
                {searchStudentInput && (
                  <button onClick={() => setSearchStudentInput("")} className="text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {searchStudentInput.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-30 max-h-60 overflow-y-auto space-y-1">
                  {modalStudentResults.map((s) => (
                    <button
                      key={s.student_id}
                      onClick={() => {
                        setSelectedStudent(s);
                        setSearchStudentInput("");
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-slate-100 font-mono font-bold flex items-center justify-center text-slate-700">
                          #{s.student_no}
                        </div>
                        <span>
                          <span className="block font-bold text-slate-900">{formatStudentFullName(s)}{s.nickname && <span className="ml-1 font-normal text-slate-400">({s.nickname})</span>}</span>
                          <span className="block mt-0.5 text-slate-600">ทำเวร {formatChoreWeeks(studentChoreLookup.get(s.student_id)?.days ?? 0)} · เวรประจำ: {weeklyDuty[s.student_id] ? `วัน${weeklyDuty[s.student_id]}` : "ยังไม่ได้กำหนด"}</span>
                        </span>
                      </div>
                      <ChevronRight size={15} className="shrink-0 text-slate-400" />
                    </button>
                  ))}
                  {modalStudentResults.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">ไม่พบนักเรียนที่ค้นหา</div>
                  )}
                </div>
              )}
            </div>

            {/* Student Profile Card (Matching html/index.html) */}
            {selectedStudent ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                
                {/* Profile Header Row */}
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-xs p-2">
                    <img
                      src={getStudentAvatar(selectedStudent)}
                      alt={selectedStudent.first_name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 truncate">
                      {formatStudentFullName(selectedStudent)}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 font-semibold">
                      รหัสประจำตัว: <span className="font-mono">{selectedStudent.student_id}</span>
                      {selectedStudent.nickname && ` • (${selectedStudent.nickname})`}
                    </p>
                  </div>
                </div>

                {/* Info Pills (from html/index.html .info-pill) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="py-2.5 px-4 rounded-full bg-slate-50 border border-slate-200 text-center font-bold text-xs text-slate-800 shadow-xs">
                    ห้อง ม.2/3
                  </div>
                  <div className="py-2.5 px-4 rounded-full bg-slate-50 border border-slate-200 text-center font-bold text-xs text-slate-800 shadow-xs">
                    เลขที่ {selectedStudent.student_no}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm">
                  <div className="font-bold text-[#16453d]">ข้อมูลการทำเวร</div>
                  <p className="mt-1 text-slate-700">ทำเวรจากบันทึกรวม <strong>{formatChoreWeeks(studentChoreLookup.get(selectedStudent.student_id)?.days ?? 0)}</strong>{studentChoreLookup.get(selectedStudent.student_id)?.unknown ? " · มีรายการที่ยังคำนวณจำนวนวันไม่ได้" : ""}</p>
                  <p className="mt-3 font-semibold text-slate-700">วันเวรประจำสัปดาห์: <strong className="text-[#16453d]">{weeklyDuty[selectedStudent.student_id] ? `วัน${weeklyDuty[selectedStudent.student_id]}` : "ยังไม่ได้กำหนด"}</strong></p>
                </div>

              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center shadow-xs space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-[#16453d] flex items-center justify-center mx-auto">
                  <UserCheck size={28} />
                </div>
                <h3 className="font-bold text-base text-slate-900">เลือกนักเรียนเพื่อดูข้อมูล</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  ค้นหาด้วยชื่อ เลขประจำตัว หรือเลขที่ด้านบน เพื่อดูข้อมูลนักเรียนและการทำเวร
                </p>
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* VIEW: ACTIVITIES & RANDOM GROUP GENERATOR                                 */}
        {/* ------------------------------------------------------------------------- */}
        {activeView === "activities" && (
          <ActivitiesAndGrouping students={students} />
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* VIEW 5: DISCIPLINARY PENALTY FORM (Modeled on html/index.html & group)     */}
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

                {/* Capsule Group Mode Button (media_1794053413314_2d75ef92.png) */}
                <button
                  type="button"
                  onClick={toggleGroupMode}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                    isGroupMode
                      ? "bg-[#16453d] text-white border-[#16453d] shadow-sm ring-2 ring-[#16453d]/20"
                      : "bg-white text-slate-700 border-slate-200 hover:border-[#16453d]/40 hover:bg-slate-50"
                  }`}
                  title={isGroupMode ? "โหมดกลุ่มเปิดอยู่" : "เปิดโหมดเลือกเป็นกลุ่ม"}
                >
                  <Users size={15} className={isGroupMode ? "text-white" : "text-[#16453d]"} />
                  <span>กลุ่ม</span>
                  {isGroupMode && <span className="w-2 h-2 rounded-full bg-emerald-300" />}
                </button>
              </div>

              <form onSubmit={handlePenaltySubmit} className="space-y-5">
                
                {/* 1. Student Selector */}
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
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#16453d]/20 focus:border-[#16453d]"
                    />
                  </div>

                  <div className="mt-2 max-h-56 overflow-y-auto border border-slate-100 rounded-2xl p-2 bg-slate-50/50 flex flex-wrap gap-1.5 custom-scrollbar">
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
                          className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1 ${
                            isSelected
                              ? "bg-[#16453d] text-white font-bold shadow-xs scale-102"
                              : "bg-white text-slate-700 border border-slate-200 hover:border-[#16453d]/40 hover:bg-slate-50"
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

                {/* 2. Behaviors (2-column capsule pills, Lucide icons, Pure white + Dark Green) */}
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

                {/* 3. Actions / Sanctions (ตักเตือน, ทำเวร, ปกครอง1-3) */}
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

                    {/* ทำเวร (เลือกระยะเวลาได้) */}
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
                    <AnimatePresence>
                    {records.slice(0, 8).map((r) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -30, backgroundColor: "#fee2e2", transition: { duration: 0.25 } }}
                        className={`hover:bg-slate-50 transition-colors ${deletingId === r.id ? "bg-rose-100 opacity-60" : ""}`}
                      >
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
                            onClick={() => setPendingDelete({ id: r.id, name: r.student_name })}
                            className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="ลบรายการ"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                    </AnimatePresence>
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
        {/* VIEW 6: HISTORY & REPORT GENERATOR (Modeled on html/report.html)          */}
        {/* ------------------------------------------------------------------------- */}
        {activeView === "history" && (
          <div className="space-y-6">

            {/* 1. PDF REPORT GENERATOR CARD (Modeled on html/report.html & User Image 2) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-7 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-[#16453d] flex items-center justify-center font-bold shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      พิมพ์รายงาน
                    </h2>
                    <p className="text-[11px] sm:text-xs text-slate-500">
                      เลือกข้อมูลรายบุคคลหรือรายห้อง ม.2/3 แล้วพิมพ์หรือบันทึกเป็น PDF ขนาด A4
                    </p>
                  </div>
                </div>

                {/* Individual vs Room Mode Toggle (Specific to Room ม.2/3) */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full text-xs font-bold self-start">
                  <button
                    type="button"
                    onClick={() => setReportMode("person")}
                    className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                      reportMode === "person"
                        ? "bg-[#16453d] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    รายบุคคล
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportMode("room")}
                    className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                      reportMode === "room"
                        ? "bg-[#16453d] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    รายห้อง (ม.2/3)
                  </button>
                </div>
              </div>

              {/* Individual Student Picker if in Person mode */}
              {reportMode === "person" ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      เลือกนักเรียนห้อง ม.2/3 ที่ต้องการออกรายงาน
                    </label>
                    <span className="text-[11px] text-slate-400">
                      (มี 53 คน)
                    </span>
                  </div>

                  {/* Native Mobile Select Dropdown for effortless phone interaction */}
                  <div className="sm:hidden">
                    <select
                      value={reportStudentId}
                      onChange={(e) => setReportStudentId(e.target.value)}
                      className="w-full py-2.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-[#16453d]"
                    >
                      {students.map((s) => (
                        <option key={`opt-mobile-${s.student_id}`} value={s.student_id}>
                          เลขที่ {s.student_no}: {s.prefix}{s.first_name} {s.last_name} {s.nickname ? `(${s.nickname})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search input for quick lookup */}
                  <div className="relative max-w-md">
                    <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={reportStudentSearch}
                      onChange={(e) => setReportStudentSearch(e.target.value)}
                      placeholder="พิมพ์ค้นหาชื่อ หรือเลขที่ (1-53)..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:bg-white focus:border-[#16453d]"
                    />
                  </div>

                  {/* Desktop / Tablet Chip List */}
                  <div className="max-h-36 overflow-y-auto border border-slate-100 rounded-2xl p-2 bg-slate-50/50 flex flex-wrap gap-1.5">
                    {reportStudentSearchResults.map((s) => {
                      const isSelected = currentReportStudent?.student_id === s.student_id;
                      return (
                        <button
                          key={`report-s-${s.student_id}`}
                          type="button"
                          onClick={() => setReportStudentId(s.student_id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1 ${
                            isSelected
                              ? "bg-[#16453d] text-white font-bold shadow-xs scale-102"
                              : "bg-white text-slate-700 border border-slate-200 hover:border-[#16453d]/40"
                          }`}
                        >
                          <span className="font-mono text-[10px] opacity-70">#{s.student_no}</span>
                          <span>{s.first_name}</span>
                          {s.nickname && <span className="opacity-75">({s.nickname})</span>}
                          {isSelected && <Check size={12} className="ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>

                  {currentReportStudent && (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#16453d] text-white font-mono text-[11px] flex items-center justify-center font-bold shrink-0">
                          {currentReportStudent.student_no}
                        </div>
                        <span className="font-bold text-slate-900">
                          {currentReportStudent.prefix}{currentReportStudent.first_name} {currentReportStudent.last_name}
                        </span>
                        {currentReportStudent.nickname && (
                          <span className="text-slate-500 font-semibold">({currentReportStudent.nickname})</span>
                        )}
                        <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">ห้อง ม.2/3</span>
                      </div>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px] self-start sm:self-auto">
                        บันทึกวินัย {studentReportRecords.length} ครั้ง
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Room Mode Banner (Only Room M.2/3) */
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full font-bold bg-[#16453d] text-white text-[11px]">
                      ม.2/3 เท่านั้น
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      รายงานสรุปวินัยนักเรียนทั้งห้อง ม.2/3 (รวม 53 คน)
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    ระบบจะจัดทำเอกสารแบบทางการสำหรับระดับชั้นมัธยมศึกษาปีที่ 2 ห้อง 3 (ม.2/3) เพื่อส่งรายงานต่อฝ่ายปกครองหรือครูประจำชั้น
                  </p>
                </div>
              )}

              {/* Action Strips: หมายเหตุ & การแสดงข้อมูล (Exact match to User Image 2) */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsNoteSectionOpen(!isNoteSectionOpen)}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                    isNoteSectionOpen || reportNote
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  หมายเหตุ {reportNote ? "✓" : ""}
                </button>

                <button
                  type="button"
                  onClick={() => setIsFieldsSectionOpen(!isFieldsSectionOpen)}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                    isFieldsSectionOpen
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  การแสดงข้อมูล
                </button>
              </div>

              {/* Collapsible Note Input */}
              {isNoteSectionOpen && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    ข้อความหมายเหตุท้ายเอกสาร
                  </label>
                  <textarea
                    rows={2}
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder="พิมพ์หมายเหตุเพิ่มเติมสำหรับแนบท้ายเอกสาร (เว้นว่างไว้หากต้องการพิมพ์เป็นเส้นประเปล่า)..."
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#16453d]"
                  />
                </div>
              )}

              {/* Primary Action Button: สร้างเอกสาร (User Image 2) */}
              <div className="pt-3 pb-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={isGeneratingDoc}
                  className="w-full sm:w-auto min-w-[260px] px-8 py-3.5 rounded-full font-bold text-sm bg-gradient-to-r from-[#16453d] to-[#1f5c51] text-white hover:opacity-95 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isGeneratingDoc ? (
                    <>
                      <RotateCw size={16} className="animate-spin" />
                      <span>กำลังสร้างเอกสาร...</span>
                    </>
                  ) : (
                    <>
                      <FileText size={16} />
                      <span>ดูตัวอย่างรายงาน</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* PREVIEW MODAL (Modeled on html/report.html & User Image 3, 4) */}
            {isPreviewModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
                <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
                  {/* Top Bar with circular close button (Image 4) */}
                  <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-white">
                    <h3 className="font-bold text-base sm:text-lg text-slate-800">
                      ตัวอย่างเอกสาร ({reportMode === "room" ? "รายห้อง ม.2/3" : `รายบุคคล: ${currentReportStudent?.first_name || ""}`})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsPreviewModalOpen(false)}
                      className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center font-bold text-lg cursor-pointer transition-colors"
                      aria-label="ปิด"
                    >
                      ×
                    </button>
                  </div>

                  {/* Scrollable Document Preview Body with Mobile Responsive Scaling */}
                  <div className="flex-1 overflow-y-auto p-2 sm:p-8 bg-slate-100/70 flex justify-center">
                    <div className="w-full flex justify-center overflow-x-hidden py-1">
                      {/* A4 Sheet Print Preview Container (Exact match to User Image 3) */}
                      <div
                        ref={reportPrintRef}
                        className="bg-white shadow-xl p-6 sm:p-12 w-[794px] min-w-[794px] min-h-[1123px] text-slate-900 border border-slate-200 flex flex-col justify-between origin-top scale-[0.43] xs:scale-[0.48] sm:scale-100 -mb-[580px] sm:mb-0"
                        style={{ fontFamily: "'LINE Seed Sans TH', 'Sarabun', sans-serif" }}
                      >
                        <div>
                          {/* Header: Logo, Vertical Blue Line, Title, Meta */}
                          <div className="grid grid-cols-[48px_1fr_auto] gap-3.5 items-start pb-4">
                            <div className="w-12 h-12 border-2 border-slate-300 rounded-sm flex items-center justify-center text-slate-400">
                              <ShieldAlert size={28} />
                            </div>
                            <div className="border-l-2 border-[#1c2a66] pl-3">
                              <div className="text-[11px] font-bold text-slate-700 leading-tight">
                                ระบบข้อมูลนักเรียน
                              </div>
                              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight mt-0.5">
                                ระดับชั้นมัธยมศึกษาปีที่ 2
                              </h1>
                            </div>
                            <div className="text-right text-[11px] leading-tight text-slate-700">
                              <div className="font-bold">ประเภทข้อมูล</div>
                              <div>{reportMode === "room" ? "รายห้อง" : "รายบุคคล"}</div>
                              <div className="font-bold mt-1">วันที่พิมพ์</div>
                              <div>{formatThaiFullDate(new Date())}</div>
                            </div>
                          </div>

                          {/* Fields: ชื่อ-สกุล, เลขประจำตัว, ห้อง, เลขที่ with underlines */}
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mt-4 text-xs sm:text-sm">
                            <div className="col-span-2 flex items-end gap-2">
                              <strong className="whitespace-nowrap font-bold">ชื่อ - สกุล</strong>
                              <span className="flex-1 border-b border-slate-600 pb-0.5 text-center font-medium">
                                {reportMode === "room"
                                  ? "ข้อมูลสรุปนักเรียนชั้นมัธยมศึกษาปีที่ 2/3 (ทั้งหมด 53 คน)"
                                  : currentReportStudent
                                  ? `${currentReportStudent.prefix}${currentReportStudent.first_name} ${currentReportStudent.last_name}`
                                  : "-"}
                              </span>
                            </div>
                            <div className="flex items-end gap-2">
                              <strong className="whitespace-nowrap font-bold">เลขประจำตัว</strong>
                              <span className="flex-1 border-b border-slate-600 pb-0.5 text-center font-medium">
                                {reportMode === "room" ? "ห้องเรียน ม.2/3" : currentReportStudent?.student_id || "-"}
                              </span>
                            </div>
                            <div className="flex items-end gap-3">
                              <div className="flex items-end gap-1.5 flex-1">
                                <strong className="whitespace-nowrap font-bold">ห้อง</strong>
                                <span className="flex-1 border-b border-slate-600 pb-0.5 text-center font-medium">
                                  ม.2/3
                                </span>
                              </div>
                              <div className="flex items-end gap-1.5 flex-1">
                                <strong className="whitespace-nowrap font-bold">เลขที่</strong>
                                <span className="flex-1 border-b border-slate-600 pb-0.5 text-center font-medium">
                                  {reportMode === "room" ? "1 - 53" : currentReportStudent?.student_no || "-"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Dashed line */}
                          <div className="border-t-2 border-dashed border-slate-700 my-6" />

                          {choreSummary.length > 0 && (
                            <div className="mb-5 text-[11px] text-slate-900">
                              <h2 className="font-bold border-b border-slate-500 pb-1 mb-2">สรุปการทำเวร (ไม่นับเสาร์–อาทิตย์และวันหยุดโรงเรียน)</h2>
                              <table className="w-full text-left border-collapse"><thead><tr className="border-b border-slate-300"><th className="py-1">นักเรียน</th><th>เริ่ม</th><th>รวม</th><th>สิ้นสุดล่าสุด</th></tr></thead><tbody>{choreSummary.map((item) => <tr key={item.no} className="border-b border-slate-100"><td className="py-1">#{item.no} {item.name}</td><td>{item.start}</td><td>{item.days} วัน{item.uncounted ? "*" : ""}</td><td>{item.end ?? "—"}</td></tr>)}</tbody></table>
                              {choreSummary.some((item) => item.uncounted > 0) && <p className="mt-1">* มีระยะเวลาที่ไม่สามารถแปลงเป็นจำนวนวันเรียนได้</p>}
                            </div>
                          )}

                          {/* Middle Content: Records Table or "ไม่ปรากฏข้อมูล" (Exact match to User Image 3) */}
                          <div className="min-h-[280px]">
                            {studentReportRecords.length === 0 ? (
                              <div className="py-12 pl-6 sm:pl-24 text-slate-500 text-sm font-medium">
                                {reportMode === "room" ? "ไม่ปรากฏข้อมูลบันทึกวินัยในห้อง ม.2/3" : "ไม่ปรากฏข้อมูล"}
                              </div>
                            ) : reportMode === "room" ? (
                              <div className="space-y-4">
                                <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-900 border-b border-slate-300 pb-1.5">
                                  <div>รายการบันทึกวินัย ห้อง ม.2/3 ทั้งหมด</div>
                                  <div>จำนวนรวม : {records.length} ครั้ง</div>
                                </div>
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b-2 border-slate-800 font-bold text-slate-800">
                                      <th className="py-1.5 px-2 w-10 text-center">เลขที่</th>
                                      <th className="py-1.5 px-2 w-36">ชื่อ - สกุล</th>
                                      <th className="py-1.5 px-2 w-28">วันที่</th>
                                      <th className="py-1.5 px-2">พฤติกรรม / เหตุการณ์</th>
                                      <th className="py-1.5 px-2">การดำเนินการ</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {records.map((r, idx) => (
                                      <tr key={`room-r-${r.id}-${idx}`}>
                                        <td className="py-1.5 px-2 text-center text-slate-600 font-mono">#{r.student_no}</td>
                                        <td className="py-1.5 px-2 font-bold text-slate-900">{r.student_name}</td>
                                        <td className="py-1.5 px-2 text-slate-700">{formatThaiFullDate(new Date(r.created_at))}</td>
                                        <td className="py-1.5 px-2 text-slate-800">{r.incident}</td>
                                        <td className="py-1.5 px-2 font-bold text-[#16453d]">{r.punishment}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                {Object.entries(groupedStudentRecords).map(([behaviorName, items]) => (
                                  <div key={behaviorName} className="space-y-2">
                                    <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-900">
                                      <div>ประเภทพฤติกรรม : {behaviorName}</div>
                                      <div>จำนวน : {items.length} ครั้ง</div>
                                    </div>
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="border-b-2 border-slate-800 font-bold text-slate-800">
                                          <th className="py-1.5 px-2 w-12 text-center">ครั้งที่</th>
                                          <th className="py-1.5 px-2 w-28">วันที่</th>
                                          <th className="py-1.5 px-2">การดำเนินการ</th>
                                          <th className="py-1.5 px-2">หมายเหตุ</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200">
                                        {items.map((r, idx) => (
                                          <tr key={r.id}>
                                            <td className="py-1.5 px-2 text-center text-slate-600">{idx + 1}</td>
                                            <td className="py-1.5 px-2 text-slate-700">{formatThaiFullDate(new Date(r.created_at))}</td>
                                            <td className="py-1.5 px-2 font-bold text-slate-900">{r.punishment}</td>
                                            <td className="py-1.5 px-2 text-slate-600">{r.follow_up_note || "-"}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer: รวมทั้งหมด, หน้าที่, เส้นประ, ช่วงข้อมูล, หมายเหตุ (Image 3) */}
                        <div className="mt-8 pt-4">
                          <div className="text-right text-xs sm:text-sm font-bold text-slate-900">
                            รวมทั้งหมด : {studentReportRecords.length} ครั้ง
                          </div>
                          <div className="text-right text-[11px] text-slate-500 mb-2">
                            หน้าที่ 1/1
                          </div>

                          <div className="border-t-2 border-dashed border-slate-700 my-2" />

                          <div className="text-[11px] sm:text-xs text-slate-700">
                            ข้อมูลตั้งแต่ : วันที่ 1 พฤษภาคม 2569 - {formatThaiFullDate(new Date())}
                          </div>

                          <div className="mt-2 text-[11px] sm:text-xs text-slate-900">
                            <strong>หมายเหตุ :</strong>
                            <div className="mt-1 space-y-1">
                              <div className="border-b border-dashed border-slate-400 h-5 px-1 truncate text-slate-700">
                                {reportNote || ""}
                              </div>
                              <div className="border-b border-dashed border-slate-400 h-5" />
                              <div className="border-b border-dashed border-slate-400 h-5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fixed Bottom Action Bar: Vibrant Coral/Orange Pill Button (Exact match to User Image 4) */}
                  <div className="p-4 bg-white/95 border-t border-slate-100 flex justify-center shadow-lg">
                    <button
                      type="button"
                      onClick={handlePrintReport}
                      className="w-full sm:w-auto max-w-xs mx-auto bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white px-9 py-3.5 rounded-full font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Printer size={18} />
                      <span>พิมพ์ / บันทึกเป็น PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PENALTY RECORDS MANAGEMENT TABLE */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-sm">
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
                    <AnimatePresence>
                    {filteredHistoryRecords.map((r) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -30, backgroundColor: "#fee2e2", transition: { duration: 0.25 } }}
                        className={`hover:bg-slate-50 transition-colors ${deletingId === r.id ? "bg-rose-100 opacity-60" : ""}`}
                      >
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
                            onClick={() => setPendingDelete({ id: r.id, name: r.student_name })}
                            className="p-1 rounded-full text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="ลบ"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                    </AnimatePresence>
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
      {/* 3. MODALS (Record Editor, Search Student)                   */}
      {/* ========================================================================= */}

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

      {/* Global Student Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">ค้นหานักเรียน</h3>
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

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 pr-1">
              {modalStudentResults.map((s) => (
                <button
                  key={s.student_id}
                  onClick={() => {
                    setSelectedStudent(s);
                    setPenaltyStudent(s);
                    setActiveView("student");
                    setIsSearchOpen(false);
                  }}
                  className="w-full text-left py-3 px-2 rounded-xl hover:bg-emerald-50 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-100 font-mono text-[11px] font-bold flex items-center justify-center text-slate-700">
                      {s.student_no}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-slate-900">{formatStudentFullName(s)}</span>
                      <span className="mt-1 block text-slate-600">ทำเวร {formatChoreWeeks(studentChoreLookup.get(s.student_id)?.days ?? 0)}{studentChoreLookup.get(s.student_id)?.unknown ? " + รายการที่ยังคำนวณไม่ได้" : ""}</span>
                      <span className="mt-0.5 block text-[#16453d]">เวรประจำ: {weeklyDuty[s.student_id] ? `วัน${weeklyDuty[s.student_id]}` : "ยังไม่ได้กำหนด"}</span>
                    </span>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Dialog open={pendingDelete !== null} onClose={() => { if (!isDeleting) setPendingDelete(null); }} className="relative z-[60]">
        <DialogBackdrop transition className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ease-out data-[closed]:opacity-0" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel transition className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mx-auto">
              <Trash2 className={`w-6 h-6 ${isDeleting ? "animate-spin" : "animate-bounce"}`} />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 text-center">ลบบันทึกวินัย?</DialogTitle>
            <Description className="mt-2 text-sm leading-relaxed text-slate-600 text-center">
              ต้องการลบบันทึกของ <strong className="text-slate-900">{pendingDelete?.name}</strong> ใช่หรือไม่? รายการที่ลบแล้วจะไม่แสดงในประวัติ
            </Description>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" data-autofocus onClick={() => setPendingDelete(null)} disabled={isDeleting} className="min-h-11 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">ยกเลิก</button>
              <button type="button" onClick={handleDeleteRecord} disabled={isDeleting} className="min-h-11 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95">
                {isDeleting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>ยืนยันลบ</span>
                  </>
                )}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* ========================================================================= */}
      {/* 4. MOBILE & RESPONSIVE BOTTOM NAVIGATION (Fits all phones, tablets & desktop) */}
      {/* ========================================================================= */}
      <nav
        className="fixed bottom-[calc(10px+env(safe-area-inset-bottom,8px))] inset-x-2.5 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 lg:hidden rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl px-1.5 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between gap-0.5 sm:gap-1.5 w-auto max-w-[420px] sm:max-w-md md:max-w-lg"
        aria-label="เมนูหลัก"
      >
        <button
          onClick={() => setActiveView("overview")}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 sm:px-2 rounded-2xl sm:rounded-full transition-all cursor-pointer ${
            activeView === "overview"
              ? "bg-[#16453d] text-white shadow-xs font-bold"
              : "text-slate-500 hover:text-[#16453d] font-medium"
          }`}
        >
          <LayoutDashboard className="w-[18px] h-[18px] sm:w-5 sm:h-5 shrink-0" />
          <span className="text-[10px] sm:text-[11px] leading-tight mt-0.5 truncate w-full text-center tracking-tight">ภาพรวม</span>
        </button>



        <button
          onClick={() => setActiveView("disciplinary")}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 sm:px-2 rounded-2xl sm:rounded-full transition-all cursor-pointer ${
            activeView === "disciplinary"
              ? "bg-[#16453d] text-white shadow-xs font-bold"
              : "text-slate-500 hover:text-[#16453d] font-medium"
          }`}
        >
          <Gavel className="w-[18px] h-[18px] sm:w-5 sm:h-5 shrink-0" />
          <span className="text-[10px] sm:text-[11px] leading-tight mt-0.5 truncate w-full text-center tracking-tight">วินัย</span>
        </button>

        <button
          onClick={() => setActiveView("student")}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 sm:px-2 rounded-2xl sm:rounded-full transition-all cursor-pointer ${
            activeView === "student"
              ? "bg-[#16453d] text-white shadow-xs font-bold"
              : "text-slate-500 hover:text-[#16453d] font-medium"
          }`}
        >
          <UserCheck className="w-[18px] h-[18px] sm:w-5 sm:h-5 shrink-0" />
          <span className="text-[10px] sm:text-[11px] leading-tight mt-0.5 truncate w-full text-center tracking-tight">นักเรียน</span>
        </button>

        <button
          onClick={() => setActiveView("activities")}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 sm:px-2 rounded-2xl sm:rounded-full transition-all cursor-pointer ${
            activeView === "activities"
              ? "bg-[#16453d] text-white shadow-xs font-bold"
              : "text-slate-500 hover:text-[#16453d] font-medium"
          }`}
        >
          <Shirt className="w-[18px] h-[18px] sm:w-5 sm:h-5 shrink-0" />
          <span className="text-[10px] sm:text-[11px] leading-tight mt-0.5 truncate w-full text-center tracking-tight">กิจกรรม</span>
        </button>

        <button
          onClick={() => setActiveView("history")}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 sm:px-2 rounded-2xl sm:rounded-full transition-all cursor-pointer ${
            activeView === "history"
              ? "bg-[#16453d] text-white shadow-xs font-bold"
              : "text-slate-500 hover:text-[#16453d] font-medium"
          }`}
        >
          <FileText className="w-[18px] h-[18px] sm:w-5 sm:h-5 shrink-0" />
          <span className="text-[10px] sm:text-[11px] leading-tight mt-0.5 truncate w-full text-center tracking-tight">รายงาน</span>
        </button>
      </nav>

    </div>
  );
}
