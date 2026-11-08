"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
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
  Table,
  Download,
  Printer,
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

const CHORE_DURATIONS = ["+1 วัน", "+1 สัปดาห์", "+1 เดือน", "1 เทอม", "1 ปีการศึกษา", "อื่นๆ"];

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

  // Selected Student for Persistent Tracking
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchStudentInput, setSearchStudentInput] = useState("");

  // Homework View Filters
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
  const [selectedChoreDuration, setSelectedChoreDuration] = useState<string>("+1 วัน");
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

  // Assignments Matrix View States (Matching Image 1)
  const [assignmentViewMode, setAssignmentViewMode] = useState<"table" | "kanban">("table");
  const [tableStudentSearch, setTableStudentSearch] = useState("");

  // Report Generator States (Matching html/report.html and Images 2, 3, 4)
  const [reportMode, setReportMode] = useState<"person" | "room">("person");
  const [reportStudentId, setReportStudentId] = useState<string>(students[0]?.student_id || "30233");
  const [reportStudentSearch, setReportStudentSearch] = useState<string>("");
  const [reportNote, setReportNote] = useState<string>("");
  const [isNoteSectionOpen, setIsNoteSectionOpen] = useState<boolean>(false);
  const [isFieldsSectionOpen, setIsFieldsSectionOpen] = useState<boolean>(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const reportPrintRef = useRef<HTMLDivElement>(null);

  // Fallback homework tasks if none returned from database
  const DEFAULT_HOMEWORK_TASKS: HomeworkTask[] = useMemo(() => [
    { id: "task-13", subject: "วิทย์", details: "13. Link โฆษณา ผลิตภัณฑ์ ล่าสุด", due_date: "2026-09-11", status: "todo" },
    { id: "task-12", subject: "วิทย์", details: "12. Link โฆษณาผลิตภัณฑ์", due_date: "2026-09-11", status: "todo" },
    { id: "task-11", subject: "วิทย์", details: "11. Lab การแยกสารโดยวิธี โครมาโทกราฟี", due_date: "2026-08-28", status: "todo" },
    { id: "task-10", subject: "วิทย์", details: "10. Lab การแยกสารโดยการกลั่นธรรมดา", due_date: "2026-08-28", status: "todo" },
    { id: "task-9", subject: "วิทย์", details: "9. Lab การแยกสารโดยการระเหยแห้ง", due_date: "2026-08-28", status: "todo" },
    { id: "task-8", subject: "วิทย์", details: "8. การแยกสารผสม", due_date: "2026-08-11", status: "todo" },
    { id: "task-7", subject: "วิทย์", details: "7. สารละลายและสารบริสุทธิ์", due_date: "2026-08-04", status: "todo" },
    { id: "task-6", subject: "วิทย์", details: "6. แบบฝึกหัดหน่วยที่ 1", due_date: "2026-07-21", status: "todo" },
  ], []);

  const activeTasks = useMemo(() => {
    return tasks && tasks.length > 0 ? tasks : DEFAULT_HOMEWORK_TASKS;
  }, [tasks, DEFAULT_HOMEWORK_TASKS]);

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

  const getTaskOverdueLevel = (dueDateStr: string): "none" | "overdue" | "critical" => {
    if (!dueDateStr) return "none";
    try {
      const due = startOfDay(new Date(dueDateStr));
      const today = startOfDay(new Date());
      if (!isBefore(due, today)) return "none";
      const days = differenceInDays(today, due);
      return days >= 7 ? "critical" : "overdue";
    } catch {
      return "none";
    }
  };

  const isTaskOverdue = (dueDateStr: string) => {
    if (!dueDateStr) return false;
    try {
      const due = startOfDay(new Date(dueDateStr));
      const today = startOfDay(new Date());
      return isBefore(due, today);
    } catch {
      return false;
    }
  };

  const handleCycleStatus = async (studentId: string, taskId: string) => {
    const currentStatus = completionMap.get(`${studentId}_${taskId}`) || "todo";
    let nextStatus: TaskCompletion["status"] = "done";
    if (currentStatus === "done") {
      nextStatus = "in_progress"; // ส่งกลับ / กำลังทำ
    } else if (currentStatus === "in_progress") {
      nextStatus = "todo"; // ยังไม่ส่ง
    } else {
      nextStatus = "done"; // ส่งแล้ว
    }

    // Optimistic instant update
    setCompletions((prev) => [
      ...prev.filter((c) => !(c.student_id === studentId && c.task_id === taskId)),
      { student_id: studentId, task_id: taskId, status: nextStatus },
    ]);

    try {
      await updateTaskCompletion(studentId, taskId, nextStatus);
      addAuditEntry("update", "student_task_completions", taskId, studentId);
    } catch (err) {
      console.warn("Cycle status update error:", err);
    }
  };

  const filteredTableStudents = useMemo(() => {
    const q = tableStudentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.student_no.toString() === q ||
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        (s.nickname && s.nickname.toLowerCase().includes(q))
    );
  }, [students, tableStudentSearch]);

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

  const handleGenerateReport = async () => {
    setIsGeneratingDoc(true);
    await new Promise((r) => setTimeout(r, 350));
    setIsGeneratingDoc(false);
    setIsPreviewModalOpen(true);
  };

  const handleDownloadPdf = async () => {
    if (!reportPrintRef.current) return;
    setIsDownloadingPdf(true);
    const loadingToast = toast.loading("กำลังจัดทำไฟล์ PDF คุณภาพสูงสำหรับโทรศัพท์...");

    let exportLayer: HTMLDivElement | null = null;
    const origWindowGCS = window.getComputedStyle;
    const origCSSProtoGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;

    try {
      // 1. Dynamic imports with fallback resolution for Turbopack & mobile
      const html2canvasMod = await import("html2canvas");
      const html2canvas = html2canvasMod.default || html2canvasMod;
      const jspdfMod = await import("jspdf");
      const jsPDF = jspdfMod.jsPDF || (jspdfMod as any).default?.jsPDF || (jspdfMod as any).default;

      if (!html2canvas || !jsPDF) {
        throw new Error("ไม่สามารถโหลดไลบรารีสร้าง PDF ได้");
      }

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      // Helper canvas using raw 8-bit framebuffer read (getImageData) to guarantee sRGB rgba(...)
      const helperCanvas = document.createElement("canvas");
      helperCanvas.width = 1;
      helperCanvas.height = 1;
      const helperCtx = helperCanvas.getContext("2d", { willReadFrequently: true });

      const sanitizeColor = (val: string, fallback: string): string => {
        if (!val || typeof val !== "string") return fallback;
        if (!val.includes("lab") && !val.includes("oklch") && !val.includes("color(") && !val.includes("color-mix(")) {
          return val;
        }
        if (helperCtx) {
          try {
            helperCtx.clearRect(0, 0, 1, 1);
            helperCtx.fillStyle = val;
            helperCtx.fillRect(0, 0, 1, 1);
            const [r, g, b, a] = helperCtx.getImageData(0, 0, 1, 1).data;
            return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
          } catch {}
        }
        return fallback;
      };

      // 2. Globally patch CSSStyleDeclaration.prototype.getPropertyValue & window.getComputedStyle
      // This completely shields html2canvas from ANY "lab" or "oklch" color strings
      CSSStyleDeclaration.prototype.getPropertyValue = function (name: string) {
        const raw = origCSSProtoGetPropertyValue.call(this, name);
        if (raw && (raw.includes("lab") || raw.includes("oklch") || raw.includes("color("))) {
          if (name.includes("shadow")) return "none";
          if (name.includes("background")) return sanitizeColor(raw, "rgb(255, 255, 255)");
          if (name.includes("border")) return sanitizeColor(raw, "rgb(226, 232, 240)");
          return sanitizeColor(raw, "rgb(21, 27, 46)");
        }
        return raw;
      };

      window.getComputedStyle = function (el: Element, pseudo?: string | null) {
        const style = origWindowGCS.call(window, el, pseudo);
        return new Proxy(style, {
          get(target, prop: string) {
            if (prop === "getPropertyValue") {
              return (name: string) => {
                const raw = target.getPropertyValue(name);
                if (raw && (raw.includes("lab") || raw.includes("oklch") || raw.includes("color("))) {
                  if (name.includes("background")) return sanitizeColor(raw, "rgb(255, 255, 255)");
                  if (name.includes("shadow")) return "none";
                  if (name.includes("border")) return sanitizeColor(raw, "rgb(226, 232, 240)");
                  return sanitizeColor(raw, "rgb(21, 27, 46)");
                }
                return raw;
              };
            }
            const val = (target as any)[prop];
            if (typeof val === "string" && (val.includes("lab") || val.includes("oklch") || val.includes("color("))) {
              if (prop.includes("background") || prop.includes("Background")) return sanitizeColor(val, "rgb(255, 255, 255)");
              if (prop.includes("shadow") || prop.includes("Shadow")) return "none";
              if (prop.includes("border") || prop.includes("Border")) return sanitizeColor(val, "rgb(226, 232, 240)");
              return sanitizeColor(val, "rgb(21, 27, 46)");
            }
            if (typeof val === "function") return val.bind(target);
            return val;
          },
        });
      };

      // 3. Create dedicated offscreen container with exact fixed A4 width (794px)
      exportLayer = document.createElement("div");
      exportLayer.id = "pdf-export-layer";
      exportLayer.style.position = "fixed";
      exportLayer.style.left = "-9999px";
      exportLayer.style.top = "0";
      exportLayer.style.width = "794px";
      exportLayer.style.background = "#ffffff";
      exportLayer.style.overflow = "visible";
      exportLayer.style.pointerEvents = "none";
      exportLayer.style.zIndex = "-9999";

      // 4. Clone target sheet and force standard hex styles
      const clone = reportPrintRef.current.cloneNode(true) as HTMLElement;
      clone.style.width = "794px";
      clone.style.minHeight = "1123px";
      clone.style.maxWidth = "794px";
      clone.style.margin = "0";
      clone.style.padding = "48px 56px";
      clone.style.boxSizing = "border-box";
      clone.style.transform = "none";
      clone.style.zoom = "1";
      clone.style.boxShadow = "none";
      clone.style.border = "none";
      clone.style.backgroundColor = "#ffffff";
      clone.style.color = "#000000";

      // Sanitize all inline styles in clone
      const allCloned = clone.querySelectorAll("*");
      allCloned.forEach((node) => {
        const el = node as HTMLElement;
        el.style.boxShadow = "none";
        el.style.textShadow = "none";
        if (el.style.color && (el.style.color.includes("lab") || el.style.color.includes("oklch"))) {
          el.style.color = sanitizeColor(el.style.color, "rgb(0,0,0)");
        }
        if (el.style.backgroundColor && (el.style.backgroundColor.includes("lab") || el.style.backgroundColor.includes("oklch"))) {
          el.style.backgroundColor = sanitizeColor(el.style.backgroundColor, "rgb(255,255,255)");
        }
        if (el.style.borderColor && (el.style.borderColor.includes("lab") || el.style.borderColor.includes("oklch"))) {
          el.style.borderColor = sanitizeColor(el.style.borderColor, "rgb(51,51,51)");
        }
      });

      exportLayer.appendChild(clone);
      document.body.appendChild(exportLayer);

      // Wait 2 animation frames and short timeout for font & DOM settlement
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 220));

      // 5. Capture with html2canvas and sanitize iframe environment
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
        onclone: (clonedDoc) => {
          // Remove all stylesheets that may define lab/oklch colors in Tailwind
          const styles = Array.from(clonedDoc.querySelectorAll("style, link[rel='stylesheet']"));
          styles.forEach((s) => s.remove());

          // Inject safe print stylesheet with standard sRGB hex colors
          const safeStyle = clonedDoc.createElement("style");
          safeStyle.textContent = `
            * {
              box-sizing: border-box !important;
              font-family: 'LINE Seed Sans TH', 'Sarabun', Arial, sans-serif !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }
            body, html {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
          `;
          clonedDoc.head.appendChild(safeStyle);

          // Proxy getComputedStyle inside the iframe
          if (clonedDoc.defaultView) {
            const win = clonedDoc.defaultView;
            const origIframeGCS = win.getComputedStyle.bind(win);
            win.getComputedStyle = function (targetEl: Element, pseudo?: string | null) {
              const res = origIframeGCS(targetEl, pseudo);
              return new Proxy(res, {
                get(target, prop: string) {
                  if (prop === "getPropertyValue") {
                    return (name: string) => {
                      const raw = target.getPropertyValue(name);
                      if (raw && (raw.includes("lab(") || raw.includes("oklch(") || raw.includes("color("))) {
                        if (name.includes("background")) return sanitizeColor(raw, "rgb(255, 255, 255)");
                        if (name.includes("shadow")) return "none";
                        if (name.includes("border")) return sanitizeColor(raw, "rgb(51, 51, 51)");
                        return sanitizeColor(raw, "rgb(0, 0, 0)");
                      }
                      return raw;
                    };
                  }
                  const val = (target as any)[prop];
                  if (typeof val === "string" && (val.includes("lab(") || val.includes("oklch(") || val.includes("color("))) {
                    if (prop.includes("background") || prop.includes("Background")) return sanitizeColor(val, "rgb(255, 255, 255)");
                    if (prop.includes("shadow") || prop.includes("Shadow")) return "none";
                    if (prop.includes("border") || prop.includes("Border")) return sanitizeColor(val, "rgb(51, 51, 51)");
                    return sanitizeColor(val, "rgb(0, 0, 0)");
                  }
                  if (typeof val === "function") return val.bind(target);
                  return val;
                },
              });
            };
          }
        },
      });

      if (!canvas || !canvas.width || !canvas.height) {
        throw new Error("ไม่สามารถจับภาพหน้าเอกสารได้");
      }

      const imgData = canvas.toDataURL("image/png");
      if (!imgData || imgData === "data:,") {
        throw new Error("ข้อมูลรูปภาพเอกสารไม่ถูกต้อง");
      }

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");

      const fileName =
        reportMode === "person" && currentReportStudent
          ? `รายงานวินัย_ม2-3_เลขที่${currentReportStudent.student_no}_${currentReportStudent.first_name}.pdf`
          : `รายงานวินัย_ห้องม2-3.pdf`;

      // 6. Universal cross-device download (iOS Safari, Android Chrome, Desktop)
      const pdfBlob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(blobUrl);
      }, 5000);

      toast.success("ดาวน์โหลด PDF เรียบร้อยแล้ว", { id: loadingToast });
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error(
        "ดาวน์โหลด PDF ไม่สำเร็จ: " + (err instanceof Error ? err.message : String(err)),
        { id: loadingToast }
      );
    } finally {
      window.getComputedStyle = origWindowGCS;
      CSSStyleDeclaration.prototype.getPropertyValue = origCSSProtoGetPropertyValue;
      if (exportLayer && document.body.contains(exportLayer)) {
        document.body.removeChild(exportLayer);
      }
      setIsDownloadingPdf(false);
    }
  };

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

  // Behavior type frequency statistics (matching html/dashboard.html)
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

  // Overall classroom completion rate
  const classroomCompletionRate = useMemo(() => {
    if (students.length === 0 || tasks.length === 0) return 0;
    const totalPossible = students.length * tasks.length;
    const totalDone = completions.filter((c) => c.status === "done").length;
    return Math.round((totalDone / totalPossible) * 100);
  }, [students, tasks, completions]);

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
    if (!q) return students.slice(0, 14);
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
    <div className="min-h-screen bg-white text-[#151b2e] flex flex-col pb-[calc(180px+env(safe-area-inset-bottom,34px))]">
      <Toaster position="top-center" toastOptions={{ duration: 2500 }} />

      {/* ========================================================================= */}
      {/* 1. TOP HEADER & SEGMENTED CONTROLS (html/index.html & dashboard.html)    */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className={`${activeView === "assignments" ? "w-full px-3 sm:px-6" : "max-w-7xl mx-auto px-4 sm:px-6"} py-3 flex items-center justify-between gap-3`}>
          
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
                ระบบติดตามการบ้านและวินัย ห้อง ม.2/3 ({students.length} คน)
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
              บันทึกวินัย
            </button>
            <button
              onClick={() => setActiveView("history")}
              className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
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
      <main className={`${activeView === "assignments" ? "w-full max-w-none px-2 sm:px-6" : "max-w-7xl mx-auto px-4 sm:px-6"} pt-6 pb-28 sm:pb-32 space-y-6 flex-1 w-full`}>

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
              {activeView === "today" && "งานที่ต้องจัดการวันนี้"}
              {activeView === "assignments" && "กระดานติดตามการบ้าน"}
              {activeView === "student" && "ข้อมูลและประวัตินักเรียน"}
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
                  <p className="text-[11px] font-semibold text-slate-500 mt-1">ส่งครบตามกำหนดเวลา</p>
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
                    <p className="text-xs text-slate-500 mt-0.5">มีบันทึกวินัยหรือค้างส่งมากที่สุด</p>
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
        {/* VIEW 2: TODAY (Tasks Due & Pending Penalties)                              */}
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
        {/* VIEW 3: ASSIGNMENTS (Vertical Rotated Matrix & Kanban Board)               */}
        {/* ------------------------------------------------------------------------- */}
        {activeView === "assignments" && (
          <div className="space-y-4">
            
            {/* Control Bar: Mode Toggle, Search, and Legend (Matching Image 1) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* View Switcher: Table vs Kanban */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full text-xs font-bold self-start">
                  <button
                    type="button"
                    onClick={() => setAssignmentViewMode("table")}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                      assignmentViewMode === "table"
                        ? "bg-[#16453d] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Table size={14} />
                    <span>ตารางติดตาม (Matrix)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentViewMode("kanban")}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                      assignmentViewMode === "kanban"
                        ? "bg-[#16453d] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Layers size={14} />
                    <span>กระดานงาน (Kanban)</span>
                  </button>
                </div>

                {/* Quick Student Search */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={tableStudentSearch}
                    onChange={(e) => setTableStudentSearch(e.target.value)}
                    placeholder="ค้นหาชื่อ หรือเลขที่ (1-53)..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:bg-white focus:border-[#16453d]"
                  />
                  {tableStudentSearch && (
                    <button
                      type="button"
                      onClick={() => setTableStudentSearch("")}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Legend Bar (Exact match to User Image 1) */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 sm:gap-5 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#e11d48] font-black text-sm">!</span>
                  <span>เลยกำหนด</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 text-[#e11d48] font-black text-[11px] leading-tight">
                    !!!
                  </span>
                  <span>เลยกำหนดมาก</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-sm border border-slate-300 bg-white inline-block shadow-2xs" />
                  <span>ยังไม่ส่ง</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-sm bg-[#5cd489] inline-block shadow-2xs" />
                  <span>ส่งแล้ว</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-sm bg-[#f97316] inline-block shadow-2xs" />
                  <span>ส่งกลับ</span>
                </div>
                <span className="text-[11px] text-slate-400 ml-auto hidden md:inline">
                  * แตะที่ช่องเพื่อเปลี่ยนสถานะ (ส่งแล้ว / ส่งกลับ / ยังไม่ส่ง)
                </span>
              </div>
            </div>

            {/* TAB 1: VERTICAL ROTATED MATRIX TABLE (Exact match to User Image 1 - ยาวไปสุดขอบฟ้า) */}
            {assignmentViewMode === "table" ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden w-full">
                <div className="overflow-x-auto overflow-y-auto max-h-[82vh] w-full">
                  <table className="border-collapse text-left select-none w-full min-w-max">
                    <thead>
                      {/* Row 1: กำหนดส่ง + Short Thai Due Dates */}
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <th className="sticky left-0 top-0 z-30 bg-slate-50 border-r border-slate-200 p-2.5 text-center text-xs font-bold text-slate-500 min-w-[150px] w-[150px] shadow-[1px_0_0_0_#e2e8f0]">
                          กำหนดส่ง
                        </th>
                        {activeTasks.map((t) => (
                          <th
                            key={`due-${t.id}`}
                            className="sticky top-0 z-20 bg-slate-50 border-r border-slate-200 p-2 text-center text-[10px] sm:text-[11px] font-medium text-slate-500 min-w-[48px] w-[48px] whitespace-nowrap"
                          >
                            {formatThaiShortDate(t.due_date)}
                          </th>
                        ))}
                      </tr>

                      {/* Row 2: นักเรียน + Vertical Rotated Column Headers reading upwards */}
                      <tr className="bg-slate-50 border-b-2 border-slate-200">
                        <th className="sticky left-0 top-[37px] z-30 bg-slate-50 border-r border-slate-200 p-3 text-center text-xs sm:text-sm font-black text-slate-800 min-w-[150px] w-[150px] shadow-[1px_0_0_0_#e2e8f0]">
                          นักเรียน
                        </th>
                        {activeTasks.map((t) => (
                          <th
                            key={`header-${t.id}`}
                            className="sticky top-[37px] z-20 bg-slate-50 border-r border-slate-200 p-1.5 min-w-[48px] w-[48px] h-[175px] align-bottom"
                          >
                            <div className="h-full flex items-end justify-center pb-2.5">
                              <span
                                className="text-[11px] font-semibold text-slate-700 whitespace-nowrap truncate max-h-[160px] tracking-tight"
                                style={{
                                  writingMode: "vertical-rl",
                                  transform: "rotate(180deg)",
                                }}
                                title={t.details}
                              >
                                {t.details}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredTableStudents.map((s) => (
                        <tr key={s.student_id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Sticky Left Pinned Column: [เลขที่]ชื่อเล่น / ชื่อ-สกุล */}
                          <td className="sticky left-0 z-10 bg-white border-r border-slate-100 px-3 py-1.5 min-w-[150px] w-[150px] h-[52px] shadow-[1px_0_0_0_#f1f5f9]">
                            <div className="flex flex-col justify-center leading-tight">
                              <span className="font-bold text-slate-900 text-xs sm:text-[13px] truncate">
                                [{s.student_no}]{s.nickname || s.first_name}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate mt-0.5">
                                {s.first_name} {s.last_name}
                              </span>
                            </div>
                          </td>

                          {/* Status Cells (Interactive Tiles matching Image 1) */}
                          {activeTasks.map((t) => {
                            const status = completionMap.get(`${s.student_id}_${t.id}`) || "todo";
                            const isOverdue = isTaskOverdue(t.due_date);

                            return (
                              <td
                                key={`cell-${s.student_id}-${t.id}`}
                                className="border-r border-slate-100 p-1.5 text-center align-middle h-[52px] min-w-[48px] w-[48px]"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleCycleStatus(s.student_id, t.id)}
                                  className={`w-8 h-8 rounded-lg mx-auto flex items-center justify-center transition-all transform active:scale-85 cursor-pointer ${
                                    status === "done"
                                      ? "bg-[#5cd489] text-white shadow-2xs"
                                      : status === "in_progress"
                                      ? "bg-[#f97316] text-white shadow-2xs"
                                      : isOverdue
                                      ? "bg-white border border-rose-200 text-[#e11d48] font-black text-xs shadow-2xs"
                                      : "bg-white border border-slate-200 hover:border-slate-400"
                                  }`}
                                  title={`เลขที่ ${s.student_no} ${s.first_name} - ${t.details} (แตะเพื่อเปลี่ยนสถานะ)`}
                                >
                                  {status === "done" ? (
                                    null
                                  ) : status === "in_progress" ? (
                                    null
                                  ) : isOverdue ? (
                                    "!!!"
                                  ) : null}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {filteredTableStudents.length === 0 && (
                        <tr>
                          <td colSpan={activeTasks.length + 1} className="py-12 text-center text-xs text-slate-400">
                            ไม่พบนักเรียนตามคำค้นหา
                          </td>
                        </tr>
                      )}
                    </tbody>

                    {/* Footer Summary Row */}
                    <tfoot>
                      <tr className="bg-slate-100 border-t-2 border-slate-200">
                        <td className="sticky left-0 bottom-0 z-30 bg-slate-100 border-r border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 min-w-[150px] w-[150px] shadow-[1px_0_0_0_#cbd5e1]">
                          ส่งแล้ว / รวม
                        </td>
                        {activeTasks.map((t) => {
                          const doneCount = students.filter(
                            (s) => completionMap.get(`${s.student_id}_${t.id}`) === "done"
                          ).length;
                          const pct = Math.round((doneCount / (students.length || 1)) * 100);
                          return (
                            <td
                              key={`summary-${t.id}`}
                              className="sticky bottom-0 z-20 bg-slate-100 border-r border-slate-200 py-2 text-center text-[10px] font-bold text-slate-700 min-w-[48px] w-[48px]"
                            >
                              <div>{doneCount}/{students.length}</div>
                              <div className="text-[9px] text-[#16453d]">{pct}%</div>
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              /* TAB 2: KANBAN COLUMNS */
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-white rounded-2xl border border-slate-200 p-2.5 shadow-xs">
                  <button
                    onClick={() => setFilterSubject("all")}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      filterSubject === "all"
                        ? "bg-[#16453d] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    ทุกวิชา ({tasks.length})
                  </button>
                  {uniqueSubjects.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setFilterSubject(sub)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        filterSubject === sub
                          ? "bg-[#16453d] text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>

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
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 font-mono font-bold flex items-center justify-center text-slate-700">
                          #{s.student_no}
                        </div>
                        <span className="font-bold text-slate-900">{formatStudentFullName(s)}</span>
                        {s.nickname && <span className="text-slate-400">({s.nickname})</span>}
                      </div>
                      <span className="font-mono text-slate-400">{s.student_id}</span>
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

                {/* Segmented Switch Control: บันทึกข้อมูล vs ดูงาน/ประวัติ */}
                <div className="grid grid-cols-2 p-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      setStudentCardTab("record");
                      setPenaltyStudent(selectedStudent);
                      setActiveView("disciplinary");
                    }}
                    className={`py-2 rounded-full transition-all cursor-pointer ${
                      studentCardTab === "record"
                        ? "bg-[#16453d] text-white shadow-xs"
                        : "text-slate-600 hover:text-[#16453d]"
                    }`}
                  >
                    บันทึกข้อมูลวินัย
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentCardTab("history")}
                    className={`py-2 rounded-full transition-all cursor-pointer ${
                      studentCardTab === "history"
                        ? "bg-[#16453d] text-white shadow-xs"
                        : "text-slate-600 hover:text-[#16453d]"
                    }`}
                  >
                    ดูงานและการบ้าน
                  </button>
                </div>

                {/* Sub-view: Student Homework & History Details */}
                {studentCardTab === "history" && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        สถานะการบ้าน ({studentStats.done}/{studentStats.total} เสร็จสิ้น)
                      </h3>
                      <span className="font-mono text-xs font-bold text-[#16453d]">
                        {studentStats.progress}%
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {tasks.map((task) => {
                        const status = completionMap.get(`${selectedStudent.student_id}_${task.id}`) ?? "todo";
                        const isDone = status === "done";
                        return (
                          <div key={task.id} className="py-2.5 flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-800 truncate mr-2">{task.subject}: {task.details}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${isDone ? "bg-emerald-50 text-[#16453d]" : "bg-rose-50 text-rose-700"}`}>
                              {isDone ? "ส่งแล้ว" : "ยังไม่ส่ง"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center shadow-xs space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-[#16453d] flex items-center justify-center mx-auto">
                  <UserCheck size={28} />
                </div>
                <h3 className="font-bold text-base text-slate-900">เลือกนักเรียนเพื่อดูข้อมูล</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  ค้นหาด้วยชื่อ เลขประจำตัว หรือเลขที่ด้านบน เพื่อดูบันทึกและสถานะการบ้าน
                </p>
              </div>
            )}

          </div>
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

                  <div className="mt-2 max-h-36 overflow-y-auto border border-slate-100 rounded-2xl p-1.5 bg-slate-50/50 flex flex-wrap gap-1">
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
                      ระบบสร้างเอกสารรายงาน (PDF Report)
                    </h2>
                    <p className="text-[11px] sm:text-xs text-slate-500">
                      ประเภทข้อมูล: รายบุคคล หรือ รายห้อง (เฉพาะ ม.2/3) พร้อมดาวน์โหลดแบบ A4
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
                      <span>สร้างเอกสาร (เปิดตัวอย่าง PDF)</span>
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
                      onClick={handleDownloadPdf}
                      disabled={isDownloadingPdf}
                      className="w-full sm:w-auto max-w-xs mx-auto bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white px-9 py-3.5 rounded-full font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isDownloadingPdf ? (
                        <>
                          <RotateCw size={18} className="animate-spin" />
                          <span>กำลังบันทึก PDF...</span>
                        </>
                      ) : (
                        <>
                          <Download size={18} />
                          <span>ดาวน์โหลด PDF</span>
                        </>
                      )}
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
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        <option value="todo">ยังไม่ส่ง</option>
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

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 pr-1">
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
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 font-mono text-[11px] font-bold flex items-center justify-center text-slate-700">
                      {s.student_no}
                    </span>
                    <span className="font-bold text-slate-900">{formatStudentFullName(s)}</span>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px]">{s.student_id}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MOBILE & RESPONSIVE BOTTOM NAVIGATION (Fits all phones, tablets & desktop) */}
      {/* ========================================================================= */}
      <nav
        className="fixed bottom-[calc(10px+env(safe-area-inset-bottom,8px))] inset-x-2.5 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl px-1.5 sm:px-3 py-1 sm:py-1.5 flex items-center justify-between gap-0.5 sm:gap-1.5 w-auto max-w-[420px] sm:max-w-md md:max-w-lg"
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
          onClick={() => setActiveView("assignments")}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 sm:px-2 rounded-2xl sm:rounded-full transition-all cursor-pointer ${
            activeView === "assignments"
              ? "bg-[#16453d] text-white shadow-xs font-bold"
              : "text-slate-500 hover:text-[#16453d] font-medium"
          }`}
        >
          <BookOpen className="w-[18px] h-[18px] sm:w-5 sm:h-5 shrink-0" />
          <span className="text-[10px] sm:text-[11px] leading-tight mt-0.5 truncate w-full text-center tracking-tight">การบ้าน</span>
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
