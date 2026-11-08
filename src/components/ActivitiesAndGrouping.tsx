"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Users,
  Shuffle,
  Shirt,
  Sparkles,
  Check,
  Copy,
  Printer,
  Trash2,
  Plus,
  Search,
  Filter,
  Trophy,
  Flag,
  Heart,
  Camera,
  Droplets,
  Crown,
  X,
  RotateCw,
  UserMinus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  SlidersHorizontal,
  ChevronRight,
  Download,
  Share2,
  Eye,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Description } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import { Student } from "@/types/penalty";
import {
  ShirtSize,
  StudentShirtInfo,
  ActivityRoleType,
  ActivityRoleConfig,
  StudentActivityAssignment,
  GroupResult,
} from "@/types/activities";
import { formatStudentFullName, getStudentAvatar } from "./DisciplinaryApp";
import SpinWheel from "./SpinWheel";

const GROUP_COLORS = [
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", headerBg: "bg-emerald-600", light: "bg-emerald-100" },
  { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-800", headerBg: "bg-sky-600", light: "bg-sky-100" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", headerBg: "bg-amber-600", light: "bg-amber-100" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", headerBg: "bg-rose-600", light: "bg-rose-100" },
  { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-800", headerBg: "bg-indigo-600", light: "bg-indigo-100" },
  { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800", headerBg: "bg-purple-600", light: "bg-purple-100" },
  { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-800", headerBg: "bg-teal-600", light: "bg-teal-100" },
  { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", headerBg: "bg-orange-600", light: "bg-orange-100" },
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", headerBg: "bg-blue-600", light: "bg-blue-100" },
  { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-800", headerBg: "bg-pink-600", light: "bg-pink-100" },
];

const STANDARD_SHIRT_SIZES: ShirtSize[] = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "Other"];

const ROLE_CONFIGS: Record<ActivityRoleType, { label: string; icon: React.ElementType; badgeBg: string; textColor: string }> = {
  athlete: { label: "นักกีฬา", icon: Trophy, badgeBg: "bg-amber-100 border-amber-300", textColor: "text-amber-800" },
  cheer_stand: { label: "กองเชียร์ / สแตนด์", icon: Users, badgeBg: "bg-sky-100 border-sky-300", textColor: "text-sky-800" },
  cheerleader: { label: "เชียร์ลีดเดอร์", icon: Sparkles, badgeBg: "bg-pink-100 border-pink-300", textColor: "text-pink-800" },
  parade_banner: { label: "ขบวนพาเหรด / ถือป้าย", icon: Flag, badgeBg: "bg-purple-100 border-purple-300", textColor: "text-purple-800" },
  welfare: { label: "สวัสดิการ / น้ำดื่ม / พยาบาล", icon: Droplets, badgeBg: "bg-emerald-100 border-emerald-300", textColor: "text-emerald-800" },
  photographer: { label: "ช่างภาพ / บันทึกภาพ", icon: Camera, badgeBg: "bg-indigo-100 border-indigo-300", textColor: "text-indigo-800" },
  cleaner: { label: "ดูแลสถานที่ / ความสะอาด", icon: Heart, badgeBg: "bg-teal-100 border-teal-300", textColor: "text-teal-800" },
  custom: { label: "หน้าที่อื่นๆ", icon: HelpCircle, badgeBg: "bg-slate-100 border-slate-300", textColor: "text-slate-800" },
  none: { label: "ยังไม่ระบุ", icon: Info, badgeBg: "bg-slate-50 border-slate-200", textColor: "text-slate-400" },
};

interface ActivitiesAndGroupingProps {
  students: Student[];
}

export default function ActivitiesAndGrouping({ students }: ActivitiesAndGroupingProps) {
  // Top-level sub-view: "wheel" | "grouping" | "sizes" | "roles"
  const [subView, setSubView] = useState<"wheel" | "grouping" | "sizes" | "roles">("wheel");

  // ==========================================
  // 1. STATE FOR GROUP GENERATOR
  // ==========================================
  const [groupMode, setGroupMode] = useState<"byGroupCount" | "byGroupSize">("byGroupCount");
  const [targetGroupCount, setTargetGroupCount] = useState<number>(4);
  const [targetGroupSize, setTargetGroupSize] = useState<number>(5);
  const [balanceGender, setBalanceGender] = useState<boolean>(true);
  const [autoAssignLeader, setAutoAssignLeader] = useState<boolean>(true);
  const [excludedStudentIds, setExcludedStudentIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<GroupResult[]>([]);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [isExcludeDialogOpen, setIsExcludeDialogOpen] = useState<boolean>(false);
  const [luckyWinner, setLuckyWinner] = useState<Student | null>(null);
  const [isLuckyRolling, setIsLuckyRolling] = useState<boolean>(false);
  const [luckyModalOpen, setLuckyModalOpen] = useState<boolean>(false);

  // ==========================================
  // 2. STATE FOR ACTIVITIES & SHIRT SIZES
  // ==========================================
  const [activityName, setActivityName] = useState<string>("งานกีฬาสีประจำปี 2026");
  const [shirtRecords, setShirtRecords] = useState<Record<string, StudentShirtInfo>>({});
  const [roleRecords, setRoleRecords] = useState<Record<string, StudentActivityAssignment>>({});
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pendingResetDialog, setPendingResetDialog] = useState<"sizes" | "roles" | "groups" | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedSizes = localStorage.getItem("ohmjaa_shirt_sizes_v1");
      if (savedSizes) setShirtRecords(JSON.parse(savedSizes));

      const savedRoles = localStorage.getItem("ohmjaa_activity_roles_v1");
      if (savedRoles) setRoleRecords(JSON.parse(savedRoles));

      const savedActivityName = localStorage.getItem("ohmjaa_current_activity_name");
      if (savedActivityName) setActivityName(savedActivityName);

      const savedGroups = localStorage.getItem("ohmjaa_saved_groups_v1");
      if (savedGroups) setGroups(JSON.parse(savedGroups));
    } catch {
      // Ignore local storage parse error
    }
  }, []);

  // Save to localStorage when updated
  const saveShirtRecords = (newRecords: Record<string, StudentShirtInfo>) => {
    setShirtRecords(newRecords);
    try {
      localStorage.setItem("ohmjaa_shirt_sizes_v1", JSON.stringify(newRecords));
    } catch {}
  };

  const saveRoleRecords = (newRecords: Record<string, StudentActivityAssignment>) => {
    setRoleRecords(newRecords);
    try {
      localStorage.setItem("ohmjaa_activity_roles_v1", JSON.stringify(newRecords));
    } catch {}
  };

  const saveActivityName = (name: string) => {
    setActivityName(name);
    try {
      localStorage.setItem("ohmjaa_current_activity_name", name);
    } catch {}
  };

  const saveGroupsState = (newGroups: GroupResult[]) => {
    setGroups(newGroups);
    try {
      localStorage.setItem("ohmjaa_saved_groups_v1", JSON.stringify(newGroups));
    } catch {}
  };

  // Active students for grouping (excluding excluded students)
  const activeStudentsForGrouping = useMemo(() => {
    return students.filter((s) => !excludedStudentIds.includes(s.student_id));
  }, [students, excludedStudentIds]);

  // ==========================================
  // GROUPING LOGIC
  // ==========================================
  const handleGenerateGroups = () => {
    if (activeStudentsForGrouping.length === 0) {
      toast.error("ไม่มีนักเรียนที่เข้าร่วมสำหรับการสุ่ม");
      return;
    }

    setIsShuffling(true);

    setTimeout(() => {
      let numGroups = targetGroupCount;
      if (groupMode === "byGroupSize") {
        numGroups = Math.max(1, Math.ceil(activeStudentsForGrouping.length / targetGroupSize));
      }
      numGroups = Math.min(numGroups, activeStudentsForGrouping.length);

      // Create group buckets
      const groupBuckets: Student[][] = Array.from({ length: numGroups }, () => []);

      if (balanceGender) {
        // Split boys and girls
        const boys = activeStudentsForGrouping
          .filter((s) => s.prefix === "ด.ช." || s.prefix === "นาย")
          .sort(() => Math.random() - 0.5);
        const girls = activeStudentsForGrouping
          .filter((s) => s.prefix === "ด.ญ." || s.prefix === "น.ส.")
          .sort(() => Math.random() - 0.5);
        const others = activeStudentsForGrouping
          .filter((s) => s.prefix !== "ด.ช." && s.prefix !== "นาย" && s.prefix !== "ด.ญ." && s.prefix !== "น.ส.")
          .sort(() => Math.random() - 0.5);

        // Round-robin distribution
        let idx = 0;
        boys.forEach((b) => {
          groupBuckets[idx % numGroups].push(b);
          idx++;
        });
        // Start girls distribution from a random offset to prevent same gender-skewed ordering
        idx = Math.floor(Math.random() * numGroups);
        girls.forEach((g) => {
          groupBuckets[idx % numGroups].push(g);
          idx++;
        });
        others.forEach((o) => {
          groupBuckets[idx % numGroups].push(o);
          idx++;
        });
      } else {
        // Pure random shuffle
        const shuffled = [...activeStudentsForGrouping].sort(() => Math.random() - 0.5);
        shuffled.forEach((student, index) => {
          groupBuckets[index % numGroups].push(student);
        });
      }

      // Build group results
      const results: GroupResult[] = groupBuckets.map((members, i) => {
        // Sort members by student_no inside each group
        const sortedMembers = [...members].sort((a, b) => a.student_no - b.student_no);
        let leaderId: string | undefined = undefined;
        if (autoAssignLeader && sortedMembers.length > 0) {
          const randomLeaderIndex = Math.floor(Math.random() * sortedMembers.length);
          leaderId = sortedMembers[randomLeaderIndex].student_id;
        }

        return {
          id: `group-${i + 1}-${Date.now()}`,
          name: `กลุ่มที่ ${i + 1}`,
          color: GROUP_COLORS[i % GROUP_COLORS.length].headerBg,
          leaderId,
          members: sortedMembers,
        };
      });

      saveGroupsState(results);
      setIsShuffling(false);
      toast.success(`สุ่มจัด ${results.length} กลุ่มเรียบร้อย! 🎉`);
    }, 400);
  };

  // Lucky Draw (สุ่มนักเรียน 1 คน)
  const handleLuckyDraw = () => {
    if (activeStudentsForGrouping.length === 0) {
      toast.error("ไม่มีรายชื่อนักเรียนสำหรับสุ่ม");
      return;
    }
    setLuckyModalOpen(true);
    setIsLuckyRolling(true);

    let counter = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * activeStudentsForGrouping.length);
      setLuckyWinner(activeStudentsForGrouping[randomIndex]);
      counter++;
      if (counter > 18) {
        clearInterval(interval);
        setIsLuckyRolling(false);
      }
    }, 90);
  };

  // Copy Group List to Clipboard
  const handleCopyGroups = () => {
    if (groups.length === 0) {
      toast.error("ยังไม่มีกลุ่มที่สุ่มไว้");
      return;
    }
    let text = `📋 ผลการจัดกลุ่ม ${activityName} (ห้อง ม.2/3)\n`;
    text += `จำนวนทั้งหมด ${groups.length} กลุ่ม | สมาชิกรวม ${activeStudentsForGrouping.length} คน\n`;
    text += `------------------------------------\n`;

    groups.forEach((g) => {
      text += `\n⭐ ${g.name} (${g.members.length} คน):\n`;
      g.members.forEach((m, idx) => {
        const isLeader = g.leaderId === m.student_id;
        text += `  ${idx + 1}. ${isLeader ? "👑 [หัวหน้า] " : ""}${formatStudentFullName(m)} (${m.nickname || "-"}) เลขที่ ${m.student_no}\n`;
      });
    });

    navigator.clipboard.writeText(text);
    toast.success("คัดลอกรายชื่อกลุ่มลงคลิปบอร์ดแล้ว! นำไปส่งใน LINE ได้เลย");
  };

  // Delete a specific group
  const handleDeleteGroup = (groupId: string) => {
    const updated = groups.filter((g) => g.id !== groupId);
    saveGroupsState(updated);
    toast.success("ลบกลุ่มแล้ว");
  };

  // Toggle leader in group
  const handleSetLeader = (groupId: string, studentId: string) => {
    const updated = groups.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          leaderId: g.leaderId === studentId ? undefined : studentId,
        };
      }
      return g;
    });
    saveGroupsState(updated);
  };

  // Rename group
  const handleRenameGroup = (groupId: string, newName: string) => {
    const updated = groups.map((g) => (g.id === groupId ? { ...g, name: newName } : g));
    saveGroupsState(updated);
  };

  // ==========================================
  // SHIRT SIZES LOGIC
  // ==========================================
  const handleSetShirtSize = (studentId: string, size: ShirtSize) => {
    const prev = shirtRecords[studentId] || { student_id: studentId, size: "" };
    const updated = {
      ...shirtRecords,
      [studentId]: {
        ...prev,
        student_id: studentId,
        size: prev.size === size ? "" : size, // Toggle off if clicked again
      },
    };
    saveShirtRecords(updated);
  };

  const handleToggleShirtPaid = (studentId: string) => {
    const prev = shirtRecords[studentId] || { student_id: studentId, size: "" };
    const updated = {
      ...shirtRecords,
      [studentId]: {
        ...prev,
        student_id: studentId,
        paid: !prev.paid,
      },
    };
    saveShirtRecords(updated);
  };

  const handleSetShirtNote = (studentId: string, note: string) => {
    const prev = shirtRecords[studentId] || { student_id: studentId, size: "" };
    const updated = {
      ...shirtRecords,
      [studentId]: {
        ...prev,
        student_id: studentId,
        note,
      },
    };
    saveShirtRecords(updated);
  };

  // Summary counts of shirt sizes
  const shirtSummary = useMemo(() => {
    const counts: Record<string, number> = {
      S: 0,
      M: 0,
      L: 0,
      XL: 0,
      "2XL": 0,
      "3XL": 0,
      "4XL": 0,
      Other: 0,
      unspecified: 0,
    };
    let paidCount = 0;

    students.forEach((s) => {
      const rec = shirtRecords[s.student_id];
      if (rec?.size && counts[rec.size] !== undefined) {
        counts[rec.size]++;
      } else {
        counts.unspecified++;
      }
      if (rec?.paid) paidCount++;
    });

    const totalSpecified = students.length - counts.unspecified;
    return { counts, totalSpecified, paidCount };
  }, [students, shirtRecords]);

  // Copy Shirt Summary
  const handleCopyShirtSummary = () => {
    let text = `📦 สรุปยอดสั่งเสื้อ: ${activityName} (ห้อง ม.2/3)\n`;
    text += `------------------------------------\n`;
    STANDARD_SHIRT_SIZES.forEach((size) => {
      const count = shirtSummary.counts[size] || 0;
      if (count > 0) {
        text += `- ไซส์ ${size}: ${count} ตัว\n`;
      }
    });
    text += `------------------------------------\n`;
    text += `รวมสั่งทั้งหมด: ${shirtSummary.totalSpecified} ตัว\n`;
    text += `ชำระเงินแล้ว: ${shirtSummary.paidCount}/${students.length} คน\n`;
    if (shirtSummary.counts.unspecified > 0) {
      text += `(ยังไม่ระบุไซส์: ${shirtSummary.counts.unspecified} คน)\n`;
    }

    navigator.clipboard.writeText(text);
    toast.success("คัดลอกสรุปยอดสั่งเสื้อแล้ว! นำไปส่งร้านหรือแชตได้เลย");
  };

  // ==========================================
  // ACTIVITY ROLES LOGIC
  // ==========================================
  const handleSetStudentRole = (studentId: string, role: ActivityRoleType, detail?: string) => {
    const prev = roleRecords[studentId] || { student_id: studentId, role: "none" };
    const updated = {
      ...roleRecords,
      [studentId]: {
        ...prev,
        student_id: studentId,
        role,
        role_detail: detail !== undefined ? detail : prev.role_detail,
      },
    };
    saveRoleRecords(updated);
  };

  // Summary counts of activity roles
  const roleSummary = useMemo(() => {
    const counts: Record<ActivityRoleType, number> = {
      athlete: 0,
      cheer_stand: 0,
      cheerleader: 0,
      parade_banner: 0,
      welfare: 0,
      photographer: 0,
      cleaner: 0,
      custom: 0,
      none: 0,
    };
    students.forEach((s) => {
      const rec = roleRecords[s.student_id];
      const r = rec?.role || "none";
      if (counts[r] !== undefined) counts[r]++;
      else counts.none++;
    });
    return counts;
  }, [students, roleRecords]);

  // Filtered Students for Shirts & Roles View
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = s.first_name.toLowerCase().includes(query);
        const matchLastName = s.last_name.toLowerCase().includes(query);
        const matchNick = (s.nickname || "").toLowerCase().includes(query);
        const matchNo = s.student_no.toString().includes(query);
        if (!matchName && !matchLastName && !matchNick && !matchNo) return false;
      }

      // Size filter
      if (sizeFilter !== "all") {
        const size = shirtRecords[s.student_id]?.size || "";
        if (sizeFilter === "unspecified" && size !== "") return false;
        if (sizeFilter === "unpaid" && shirtRecords[s.student_id]?.paid) return false;
        if (sizeFilter !== "unspecified" && sizeFilter !== "unpaid" && size !== sizeFilter) return false;
      }

      // Role filter
      if (roleFilter !== "all") {
        const role = roleRecords[s.student_id]?.role || "none";
        if (roleFilter !== role) return false;
      }

      return true;
    });
  }, [students, searchQuery, sizeFilter, roleFilter, shirtRecords, roleRecords]);

  // Confirmation Reset Action
  const handleConfirmReset = () => {
    if (pendingResetDialog === "sizes") {
      saveShirtRecords({});
      toast.success("ล้างข้อมูลไซส์เสื้อทั้งหมดแล้ว");
    } else if (pendingResetDialog === "roles") {
      saveRoleRecords({});
      toast.success("ล้างข้อมูลหน้าที่ทั้งหมดแล้ว");
    } else if (pendingResetDialog === "groups") {
      saveGroupsState([]);
      toast.success("ล้างข้อมูลกลุ่มทั้งหมดแล้ว");
    }
    setPendingResetDialog(null);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* ========================================================================= */}
      {/* HEADER BANNER & SUB-NAVIGATION                                             */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-[#16453d] to-[#0d2a25] rounded-3xl p-5 sm:p-7 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>ห้อง ม.2/3 • เครื่องมือครูประจำชั้น</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
              กิจกรรมห้อง & สุ่มจัดกลุ่ม
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              สุ่มแบ่งกลุ่มนักเรียน สรุปยอดสั่งตัดเสื้อกิจกรรม และจัดสรรหน้าที่ในงานกิจกรรม
            </p>
          </div>

          {/* Quick Sub-view Buttons */}
          <div className="flex items-center gap-1.5 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/10 self-start md:self-auto">
            <button
              onClick={() => setSubView("wheel")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subView === "wheel"
                  ? "bg-white text-[#16453d] shadow-sm scale-100"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <span className="text-xs">🎡</span>
              <span>วงล้อสุ่ม</span>
            </button>

            <button
              onClick={() => setSubView("grouping")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subView === "grouping"
                  ? "bg-white text-[#16453d] shadow-sm scale-100"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>สุ่มจัดกลุ่ม</span>
            </button>

            <button
              onClick={() => setSubView("sizes")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subView === "sizes"
                  ? "bg-white text-[#16453d] shadow-sm scale-100"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>ไซส์เสื้อ</span>
              {shirtSummary.totalSpecified > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {shirtSummary.totalSpecified}
                </span>
              )}
            </button>

            <button
              onClick={() => setSubView("roles")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subView === "roles"
                  ? "bg-white text-[#16453d] shadow-sm scale-100"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>หน้าที่กิจกรรม</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 0. SUB-VIEW: SPIN WHEEL (วงล้อสุ่ม)                                      */}
      {/* ========================================================================= */}
      {subView === "wheel" && (
        <SpinWheel students={students} />
      )}

      {/* ========================================================================= */}
      {/* 1. SUB-VIEW: RANDOM GROUP GENERATOR                                       */}
      {/* ========================================================================= */}
      {subView === "grouping" && (
        <div className="space-y-6">
          {/* Controls Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <Shuffle className="w-5 h-5 text-[#16453d]" />
                  ตั้งค่าการสุ่มจัดกลุ่ม
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  นักเรียนพร้อมสุ่ม: <span className="font-bold text-[#16453d]">{activeStudentsForGrouping.length}</span> จาก {students.length} คน
                  {excludedStudentIds.length > 0 && (
                    <span className="text-rose-500 ml-2 font-medium">
                      (ยกเว้น {excludedStudentIds.length} คน)
                    </span>
                  )}
                </p>
              </div>

              {/* Exclusion & Lucky Draw buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExcludeDialogOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <UserMinus className="w-3.5 h-3.5 text-slate-500" />
                  <span>ยกเว้นคนไม่มา ({excludedStudentIds.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubView("wheel")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <span className="text-xs">🎡</span>
                  <span>เปิดวงล้อสุ่ม 🎯</span>
                </button>
              </div>
            </div>

            {/* Settings Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-5">
              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">วิธีแบ่งกลุ่ม</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setGroupMode("byGroupCount")}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      groupMode === "byGroupCount"
                        ? "bg-white text-[#16453d] shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    กำหนดจำนวนกลุ่ม
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupMode("byGroupSize")}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      groupMode === "byGroupSize"
                        ? "bg-white text-[#16453d] shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    กำหนดคนต่อกลุ่ม
                  </button>
                </div>
              </div>

              {/* Number Input / Stepper */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  {groupMode === "byGroupCount" ? "จำนวนกลุ่มที่ต้องการ" : "จำนวนคนต่อหนึ่งกลุ่ม"}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={2}
                    max={groupMode === "byGroupCount" ? 15 : 20}
                    value={groupMode === "byGroupCount" ? targetGroupCount : targetGroupSize}
                    onChange={(e) => {
                      const val = Math.max(2, parseInt(e.target.value) || 2);
                      if (groupMode === "byGroupCount") setTargetGroupCount(val);
                      else setTargetGroupSize(val);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16453d]"
                  />
                  <div className="flex gap-1 shrink-0">
                    {[3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          if (groupMode === "byGroupCount") setTargetGroupCount(num);
                          else setTargetGroupSize(num);
                        }}
                        className={`w-8 h-9 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          (groupMode === "byGroupCount" ? targetGroupCount : targetGroupSize) === num
                            ? "bg-[#16453d] text-white border-[#16453d]"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 mb-1">ตัวเลือกความสมดุล</label>
                
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={balanceGender}
                    onChange={(e) => setBalanceGender(e.target.checked)}
                    className="w-4 h-4 rounded text-[#16453d] focus:ring-[#16453d]"
                  />
                  <span>คละ ชาย-หญิง ให้เท่าๆ กันทุกกลุ่ม ⚖️</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoAssignLeader}
                    onChange={(e) => setAutoAssignLeader(e.target.checked)}
                    className="w-4 h-4 rounded text-[#16453d] focus:ring-[#16453d]"
                  />
                  <span>สุ่มเลือกหัวหน้ากลุ่มอัตโนมัติ 👑</span>
                </label>
              </div>
            </div>

            {/* Big Action Bar */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateGroups}
                  disabled={isShuffling}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#16453d] hover:bg-[#0f352e] text-white text-sm font-black shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Shuffle className={`w-4 h-4 ${isShuffling ? "animate-spin" : ""}`} />
                  <span>{groups.length > 0 ? "สุ่มจัดกลุ่มใหม่" : "เริ่มสุ่มจัดกลุ่มเลย!"}</span>
                </button>

                {groups.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPendingResetDialog("groups")}
                    className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="ล้างข้อมูลกลุ่มทั้งหมด"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {groups.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyGroups}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>คัดลอกรายชื่อกลุ่ม</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์ A4</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Group Results Display */}
          {groups.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <span>ผลลัพธ์การแบ่งกลุ่ม ({groups.length} กลุ่ม)</span>
                  <span className="text-xs font-normal text-slate-400">
                    • เฉลี่ยกลุ่มละ {Math.round(activeStudentsForGrouping.length / groups.length)} คน
                  </span>
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence>
                  {groups.map((group, groupIdx) => {
                    const colorScheme = GROUP_COLORS[groupIdx % GROUP_COLORS.length];
                    const boysCount = group.members.filter((m) => m.prefix === "ด.ช." || m.prefix === "นาย").length;
                    const girlsCount = group.members.filter((m) => m.prefix === "ด.ญ." || m.prefix === "น.ส.").length;

                    return (
                      <motion.div
                        key={group.id}
                        initial={{ opacity: 0, scale: 0.9, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -20, transition: { duration: 0.2 } }}
                        transition={{ duration: 0.25, delay: groupIdx * 0.05 }}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                      >
                        {/* Group Card Header */}
                        <div className={`${colorScheme.headerBg} p-3.5 text-white flex items-center justify-between`}>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-black">
                              {groupIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={group.name}
                              onChange={(e) => handleRenameGroup(group.id, e.target.value)}
                              className="bg-transparent text-white font-bold text-sm focus:outline-none focus:bg-white/20 px-1.5 py-0.5 rounded transition-colors"
                              title="คลิกเพื่อแก้ไขชื่อกลุ่ม"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                              {group.members.length} คน (ช {boysCount} / ญ {girlsCount})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(group.id)}
                              className="p-1 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
                              title="ลบกลุ่มนี้"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Group Members List */}
                        <div className="p-3 divide-y divide-slate-100 flex-1">
                          <AnimatePresence>
                            {group.members.map((member, memberIdx) => {
                              const isLeader = group.leaderId === member.student_id;
                              return (
                                <motion.div
                                  key={member.student_id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 20 }}
                                  className={`py-2 px-2 flex items-center justify-between rounded-xl transition-colors ${
                                    isLeader ? "bg-amber-50/80 font-bold" : "hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="text-slate-400 font-mono text-[11px] w-5 text-center shrink-0">
                                      #{member.student_no}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 truncate">
                                        <span className="text-xs text-slate-800 truncate">
                                          {formatStudentFullName(member)}
                                        </span>
                                        {member.nickname && (
                                          <span className="text-[11px] text-slate-500 shrink-0">
                                            ({member.nickname})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    {isLeader && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full shadow-xs">
                                        <Crown className="w-3 h-3 text-amber-700" />
                                        หัวหน้า
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleSetLeader(group.id, member.student_id)}
                                      className="p-1 text-slate-300 hover:text-amber-500 rounded transition-colors cursor-pointer"
                                      title={isLeader ? "ยกเลิกหัวหน้า" : "ตั้งเป็นหัวหน้ากลุ่ม"}
                                    >
                                      <Crown className={`w-3.5 h-3.5 ${isLeader ? "text-amber-500 fill-amber-500" : ""}`} />
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-50 text-[#16453d] flex items-center justify-center mx-auto mb-3">
                <Shuffle className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-800">ยังไม่มีการจัดกลุ่ม</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                เลือกจำนวนกลุ่มที่ต้องการแล้วกดปุ่ม &quot;เริ่มสุ่มจัดกลุ่มเลย!&quot; เพื่อแบ่งกลุ่มนักเรียน ม.2/3 อย่างรวดเร็ว
              </p>
              <button
                type="button"
                onClick={handleGenerateGroups}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16453d] hover:bg-[#0f352e] text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>สุ่มกลุ่มทันที</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUB-VIEW: SHIRT SIZES                                                  */}
      {/* ========================================================================= */}
      {subView === "sizes" && (
        <div className="space-y-6">
          {/* Summary Box & Header */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Shirt className="w-5 h-5 text-[#16453d]" />
                  <input
                    type="text"
                    value={activityName}
                    onChange={(e) => saveActivityName(e.target.value)}
                    className="font-black text-slate-900 text-base sm:text-lg border-b border-dashed border-slate-300 hover:border-[#16453d] focus:border-[#16453d] focus:outline-none transition-colors"
                    title="คลิกเพื่อแก้ไขชื่อกิจกรรม"
                  />
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  กรอกไซส์แล้ว: <span className="font-bold text-[#16453d]">{shirtSummary.totalSpecified}</span> / {students.length} คน
                  • จ่ายเงินแล้ว: <span className="font-bold text-emerald-600">{shirtSummary.paidCount}</span> คน
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyShirtSummary}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>คัดลอกสรุปส่งร้าน</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ใบสั่งเสื้อ A4</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPendingResetDialog("sizes")}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="ล้างข้อมูลไซส์เสื้อทั้งหมด"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Stat Cards for Sizes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-5">
              {STANDARD_SHIRT_SIZES.map((size) => {
                const count = shirtSummary.counts[size] || 0;
                return (
                  <div
                    key={size}
                    onClick={() => setSizeFilter(sizeFilter === size ? "all" : size)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      sizeFilter === size
                        ? "bg-[#16453d] text-white border-[#16453d] shadow-sm scale-102"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <span className="text-[11px] font-bold block opacity-80">ไซส์ {size}</span>
                    <span className="text-xl font-black mt-0.5 block">{count}</span>
                    <span className="text-[10px] opacity-70 block">ตัว</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ, นามสกุล, ชื่อเล่น หรือเลขที่..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16453d]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16453d] cursor-pointer"
              >
                <option value="all">ไซส์ทั้งหมด</option>
                {STANDARD_SHIRT_SIZES.map((s) => (
                  <option key={s} value={s}>
                    ไซส์ {s} ({shirtSummary.counts[s] || 0})
                  </option>
                ))}
                <option value="unspecified">ยังไม่ระบุ ({shirtSummary.counts.unspecified})</option>
                <option value="unpaid">ยังไม่จ่ายเงิน</option>
              </select>
            </div>
          </div>

          {/* Student Shirts Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <tr>
                    <th className="py-3 px-3 w-14 text-center">เลขที่</th>
                    <th className="py-3 px-3">ชื่อ - สกุล</th>
                    <th className="py-3 px-3">ชื่อเล่น</th>
                    <th className="py-3 px-3 min-w-[260px]">เลือกไซส์เสื้อ</th>
                    <th className="py-3 px-3 text-center">ชำระเงิน</th>
                    <th className="py-3 px-3">โน้ตเพิ่มเติม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {filteredStudents.map((student) => {
                      const shirt = shirtRecords[student.student_id];
                      const selectedSize = shirt?.size || "";
                      const isPaid = !!shirt?.paid;

                      return (
                        <motion.tr
                          key={student.student_id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0 }}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                            #{student.student_no}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {formatStudentFullName(student)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {student.nickname || "-"}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap items-center gap-1">
                              {STANDARD_SHIRT_SIZES.slice(0, 7).map((size) => (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => handleSetShirtSize(student.student_id, size)}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                    selectedSize === size
                                      ? "bg-[#16453d] text-white border-[#16453d] shadow-xs scale-105"
                                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                  }`}
                                >
                                  {size}
                                </button>
                              ))}
                              {selectedSize && (
                                <button
                                  type="button"
                                  onClick={() => handleSetShirtSize(student.student_id, "" as ShirtSize)}
                                  className="p-1 text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"
                                  title="ล้างไซส์"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleShirtPaid(student.student_id)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                                isPaid
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                  : "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              {isPaid ? "✓ จ่ายแล้ว" : "ยังไม่จ่าย"}
                            </button>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={shirt?.note || ""}
                              onChange={(e) => handleSetShirtNote(student.student_id, e.target.value)}
                              placeholder="เช่น แขนยาว, อก 42"
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#16453d] focus:outline-none text-xs text-slate-700 py-0.5 px-1 transition-colors"
                            />
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
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

      {/* ========================================================================= */}
      {/* 3. SUB-VIEW: ACTIVITY ROLES                                               */}
      {/* ========================================================================= */}
      {subView === "roles" && (
        <div className="space-y-6">
          {/* Header & Role Statistics */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#16453d]" />
                  จัดสรรหน้าที่ในกิจกรรม: {activityName}
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  มอบหมายหน้าที่ให้นักเรียน ม.2/3 ทุกคน เพื่อให้มีส่วนร่วมครบทุกคน
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ใบหน้าที่ A4</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPendingResetDialog("roles")}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="ล้างข้อมูลหน้าที่ทั้งหมด"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Role Badges Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-5">
              {(Object.keys(ROLE_CONFIGS) as ActivityRoleType[])
                .filter((r) => r !== "none")
                .map((roleKey) => {
                  const conf = ROLE_CONFIGS[roleKey];
                  const Icon = conf.icon;
                  const count = roleSummary[roleKey] || 0;
                  const isSelected = roleFilter === roleKey;

                  return (
                    <div
                      key={roleKey}
                      onClick={() => setRoleFilter(isSelected ? "all" : roleKey)}
                      className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#16453d] text-white border-[#16453d] shadow-sm scale-102"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <Icon className="w-4 h-4 mx-auto mb-1 opacity-80" />
                      <span className="text-[10px] font-bold block truncate">{conf.label}</span>
                      <span className="text-base font-black mt-0.5 block">{count}</span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ, เลขที่ หรือชนิดกีฬา..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16453d]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16453d] cursor-pointer"
              >
                <option value="all">ทุกหน้าที่ ({students.length})</option>
                {(Object.keys(ROLE_CONFIGS) as ActivityRoleType[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_CONFIGS[r].label} ({roleSummary[r] || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Role Assignment Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <tr>
                    <th className="py-3 px-3 w-14 text-center">เลขที่</th>
                    <th className="py-3 px-3">ชื่อ - สกุล</th>
                    <th className="py-3 px-3">ชื่อเล่น</th>
                    <th className="py-3 px-3 min-w-[200px]">หน้าที่ที่ได้รับมอบหมาย</th>
                    <th className="py-3 px-3 min-w-[220px]">รายละเอียดหน้าที่ (เช่น กีฬา/ฝ่าย)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {filteredStudents.map((student) => {
                      const assignment = roleRecords[student.student_id];
                      const currentRole = assignment?.role || "none";
                      const currentConfig = ROLE_CONFIGS[currentRole];
                      const Icon = currentConfig.icon;

                      return (
                        <motion.tr
                          key={student.student_id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0 }}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                            #{student.student_no}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {formatStudentFullName(student)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {student.nickname || "-"}
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={currentRole}
                              onChange={(e) =>
                                handleSetStudentRole(student.student_id, e.target.value as ActivityRoleType)
                              }
                              className={`rounded-xl px-2.5 py-1 text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-[#16453d] cursor-pointer ${currentConfig.badgeBg} ${currentConfig.textColor}`}
                            >
                              {(Object.keys(ROLE_CONFIGS) as ActivityRoleType[]).map((r) => (
                                <option key={r} value={r}>
                                  {ROLE_CONFIGS[r].label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={assignment?.role_detail || ""}
                              onChange={(e) =>
                                handleSetStudentRole(student.student_id, currentRole, e.target.value)
                              }
                              placeholder={
                                currentRole === "athlete"
                                  ? "เช่น ฟุตบอล, วิ่ง 100ม."
                                  : currentRole === "parade_banner"
                                  ? "เช่น ถือป้ายสีม่วง"
                                  : "ระบุรายละเอียดเพิ่มเติม"
                              }
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#16453d] focus:outline-none text-xs text-slate-700 py-0.5 px-1 transition-colors"
                            />
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
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

      {/* ========================================================================= */}
      {/* MODAL: EXCLUDE STUDENTS FROM GROUPING                                     */}
      {/* ========================================================================= */}
      <Dialog
        open={isExcludeDialogOpen}
        onClose={() => setIsExcludeDialogOpen(false)}
        className="relative z-50"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 transition-all duration-300 data-[closed]:scale-95 data-[closed]:opacity-0 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <DialogTitle className="text-base font-black text-slate-900">
                  เลือกนักเรียนที่ไม่ร่วมสุ่มจัดกลุ่ม
                </DialogTitle>
                <Description className="text-xs text-slate-500 mt-0.5">
                  ติ๊กเลือกนักเรียนที่ขาดเรียน ลา หรือติดภารกิจอื่น เพื่อไม่ให้นำไปสุ่มเข้ากลุ่ม
                </Description>
              </div>
              <button
                type="button"
                onClick={() => setIsExcludeDialogOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick check/uncheck */}
            <div className="py-2.5 flex items-center justify-between border-b border-slate-100 text-xs">
              <span className="font-bold text-slate-700">
                ยกเว้นอยู่: <span className="text-rose-600">{excludedStudentIds.length}</span> คน
              </span>
              {excludedStudentIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExcludedStudentIds([])}
                  className="text-xs text-[#16453d] font-bold hover:underline cursor-pointer"
                >
                  ล้างรายการยกเว้นทั้งหมด
                </button>
              )}
            </div>

            {/* Student List with Checkboxes */}
            <div className="flex-1 overflow-y-auto py-2 divide-y divide-slate-100 max-h-[50vh]">
              {students.map((student) => {
                const isExcluded = excludedStudentIds.includes(student.student_id);
                return (
                  <label
                    key={student.student_id}
                    className={`flex items-center justify-between py-2 px-2 rounded-xl cursor-pointer transition-colors ${
                      isExcluded ? "bg-rose-50/70" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isExcluded}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setExcludedStudentIds([...excludedStudentIds, student.student_id]);
                          } else {
                            setExcludedStudentIds(excludedStudentIds.filter((id) => id !== student.student_id));
                          }
                        }}
                        className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span className="font-mono text-xs text-slate-400 w-5">#{student.student_no}</span>
                      <span className="text-xs font-bold text-slate-800">{formatStudentFullName(student)}</span>
                      {student.nickname && (
                        <span className="text-xs text-slate-400">({student.nickname})</span>
                      )}
                    </div>

                    {isExcluded && (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                        ไม่ร่วมสุ่ม
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsExcludeDialogOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-[#16453d] text-white text-xs font-bold hover:bg-[#0f352e] transition-colors cursor-pointer"
              >
                เสร็จสิ้น ({students.length - excludedStudentIds.length} คนพร้อมสุ่ม)
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: LUCKY DRAW (สุ่มผู้โชคดี 1 คน)                                      */}
      {/* ========================================================================= */}
      <Dialog
        open={luckyModalOpen}
        onClose={() => setLuckyModalOpen(false)}
        className="relative z-50"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl border border-slate-100 transition-all duration-300 data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Sparkles className="w-8 h-8" />
            </div>

            <DialogTitle className="text-lg font-black text-slate-900">
              {isLuckyRolling ? "กำลังสุ่มผู้โชคดี..." : "ผู้โชคดีคือ!"}
            </DialogTitle>

            {luckyWinner ? (
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-b from-amber-50 to-orange-50 border border-amber-200">
                <span className="text-xs font-mono font-bold text-amber-700 bg-amber-200/70 px-2 py-0.5 rounded-full">
                  เลขที่ #{luckyWinner.student_no}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  {formatStudentFullName(luckyWinner)}
                </h3>
                {luckyWinner.nickname && (
                  <p className="text-sm font-bold text-amber-800 mt-0.5">
                    น้อง{luckyWinner.nickname}
                  </p>
                )}
              </div>
            ) : null}

            <div className="mt-6 flex gap-2 justify-center">
              <button
                type="button"
                onClick={handleLuckyDraw}
                disabled={isLuckyRolling}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                สุ่มใหม่อีกรอบ 🎯
              </button>
              <button
                type="button"
                onClick={() => setLuckyModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* ========================================================================= */}
      {/* CONFIRM RESET DIALOG                                                      */}
      {/* ========================================================================= */}
      <Dialog
        open={pendingResetDialog !== null}
        onClose={() => setPendingResetDialog(null)}
        className="relative z-50"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 transition-all duration-300 data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 animate-bounce" />
            </div>
            <DialogTitle className="text-base font-black text-slate-900 text-center">
              ยืนยันการล้างข้อมูล?
            </DialogTitle>
            <Description className="mt-2 text-xs text-slate-500 text-center">
              คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูล
              {pendingResetDialog === "sizes" && "ไซส์เสื้อทั้งหมด"}
              {pendingResetDialog === "roles" && "หน้าที่ในกิจกรรมทั้งหมด"}
              {pendingResetDialog === "groups" && "ผลการจัดกลุ่มทั้งหมด"}?
              การกระทำนี้จะล้างข้อมูลที่บันทึกไว้ในเบราว์เซอร์
            </Description>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingResetDialog(null)}
                className="min-h-10 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="min-h-10 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-all active:scale-95 cursor-pointer"
              >
                ยืนยันล้างข้อมูล
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}

