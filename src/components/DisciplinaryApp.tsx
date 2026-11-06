"use client";

import React, { useState, useTransition, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  CheckCircle,
  AlertTriangle,
  Info,
  Leaf,
  Flame,
  ShieldAlert,
  Gavel,
  PlusCircle,
  History,
  FileSpreadsheet,
  Clock,
  Trash2,
  FolderOpen,
} from "lucide-react";
import { Student, PenaltyRecord, SeverityLevel } from "@/types/penalty";
import { createPenaltyRecord, deletePenaltyRecord } from "@/app/actions";

interface DisciplinaryAppProps {
  initialStudents: Student[];
  initialRecords: PenaltyRecord[];
}

const severityRules: Record<
  SeverityLevel,
  {
    title: string;
    punishment: string;
    icon: React.ElementType;
    iconColor: string;
    textClass: string;
    borderClass: string;
    activeBorder: string;
    activeBg: string;
    badgeBg: string;
  }
> = {
  low: {
    title: "รุนแรงน้อย",
    punishment: "ทำเวร 1 วัน",
    icon: Leaf,
    iconColor: "text-emerald-500",
    textClass: "text-emerald-700",
    borderClass: "hover:border-emerald-400",
    activeBorder: "border-emerald-500",
    activeBg: "bg-emerald-50",
    badgeBg: "bg-emerald-100",
  },
  medium: {
    title: "รุนแรงกลาง",
    punishment: "ทำเวร 1 อาทิตย์",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    textClass: "text-amber-700",
    borderClass: "hover:border-amber-400",
    activeBorder: "border-amber-500",
    activeBg: "bg-amber-50",
    badgeBg: "bg-amber-100",
  },
  high: {
    title: "รุนแรงมาก",
    punishment: "ทำเวร 1 เดือน",
    icon: Flame,
    iconColor: "text-rose-500",
    textClass: "text-rose-700",
    borderClass: "hover:border-rose-400",
    activeBorder: "border-rose-500",
    activeBg: "bg-rose-50",
    badgeBg: "bg-rose-100",
  },
  strict: {
    title: "ปกครอง",
    punishment: "ให้ใบปกครอง",
    icon: ShieldAlert,
    iconColor: "text-purple-600",
    textClass: "text-purple-700",
    borderClass: "hover:border-purple-400",
    activeBorder: "border-purple-600",
    activeBg: "bg-purple-50",
    badgeBg: "bg-purple-100",
  },
};

export default function DisciplinaryApp({
  initialStudents,
  initialRecords,
}: DisciplinaryAppProps) {
  const [students] = useState<Student[]>(initialStudents);
  const [records, setRecords] = useState<PenaltyRecord[]>(initialRecords);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [incidentInput, setIncidentInput] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel>("medium");

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "warning" | "info">("success");

  const [isPending, startTransition] = useTransition();

  const showToast = (message: string, type: "success" | "warning" | "info" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.student_id.includes(q) ||
        s.student_no.toString() === q ||
        (s.nickname && s.nickname.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  // Handle Save Record
  const handleSaveRecord = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedStudent) {
      showToast("กรุณาเลือกลูกศิษย์ก่อนบันทึก!", "warning");
      return;
    }
    if (!incidentInput.trim()) {
      showToast("กรุณากรอกสาเหตุหรือพฤติกรรม!", "warning");
      return;
    }

    const rule = severityRules[selectedSeverity];

    startTransition(async () => {
      const created = await createPenaltyRecord({
        student_id: selectedStudent.student_id,
        student_no: selectedStudent.student_no,
        student_name: `${selectedStudent.prefix}${selectedStudent.first_name} ${selectedStudent.last_name}`,
        student_nickname: selectedStudent.nickname,
        severity: selectedSeverity,
        severity_title: rule.title,
        incident: incidentInput.trim(),
        punishment: rule.punishment,
        status: "pending",
      });

      setRecords((prev) => [created, ...prev]);
      setIncidentInput("");
      showToast(
        `บันทึกบทลงโทษ ${selectedStudent.prefix}${selectedStudent.first_name} เรียบร้อยแล้ว`,
        "success"
      );
    });
  };

  // Handle Delete Record
  const handleDeleteRecord = (id: string) => {
    startTransition(async () => {
      await deletePenaltyRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      showToast("ลบรายการประวัติแล้ว", "info");
    });
  };

  // Handle Export Excel
  const handleExportExcel = () => {
    if (records.length === 0) {
      showToast("ยังไม่มีประวัติสำหรับส่งออก Excel", "warning");
      return;
    }

    const dataToExport = records.map((r, idx) => ({
      ลำดับ: idx + 1,
      รหัสนักเรียน: r.student_id,
      เลขที่: r.student_no,
      ชื่อ_สกุล: r.student_name,
      ชื่อเล่น: r.student_nickname || "-",
      ระดับความรุนแรง: r.severity_title,
      สาเหตุ: r.incident,
      บทลงโทษ: r.punishment,
      วันที่: new Date(r.created_at).toLocaleString("th-TH"),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ประวัติการลงโทษ");
    XLSX.writeFile(
      workbook,
      `ohmjaa_history_${new Date().toISOString().split("T")[0]}.xlsx`
    );
    showToast("ส่งออก Excel สำเร็จแล้ว", "success");
  };

  return (
    <>
      {/* Toast Notification */}
      <div
        className={`fixed bottom-5 right-5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 transition-all duration-300 z-50 ${
          toastMessage ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
        }`}
      >
        {toastType === "success" && <CheckCircle className="h-5 w-5 text-emerald-400" />}
        {toastType === "warning" && <AlertTriangle className="h-5 w-5 text-amber-400" />}
        {toastType === "info" && <Info className="h-5 w-5 text-blue-400" />}
        <span className="text-sm">{toastMessage}</span>
      </div>

      {/* Main Container 12 Cols */}
      <main className="max-w-5xl mx-auto px-4 py-6 flex-grow w-full grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
        
        {/* Left Column: Student Selector & Penalty Form (7 cols) */}
        <section className="lg:col-span-7 space-y-6">
          
          {/* Step 1: Select Student */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-sm font-bold">
                  1
                </span>
                เลือกลูกศิษย์ ม.2/3
              </h2>
              <span
                className={`text-xs px-2.5 py-1 rounded-full ${
                  selectedStudent
                    ? "font-medium text-rose-600 bg-rose-100"
                    : "text-slate-500 bg-slate-100"
                }`}
              >
                {selectedStudent
                  ? `เลขที่ ${selectedStudent.student_no} - ${selectedStudent.first_name}`
                  : "ยังไม่ได้เลือก"}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาตามชื่อ, นามสกุล หรือ เลขประจำตัว..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
              />
            </div>

            {/* Student List Scrollable */}
            <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  ไม่พบข้อมูลนักเรียนที่ตรงกับคำค้นหา
                </div>
              ) : (
                filteredStudents.map((st) => {
                  const isSelected = selectedStudent?.student_id === st.student_id;
                  return (
                    <div
                      key={st.student_id}
                      onClick={() => setSelectedStudent(st)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "border-rose-500 bg-rose-50/60 shadow-sm"
                          : "border-slate-200/80 hover:border-rose-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSelected
                              ? "bg-rose-500 text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {st.student_no}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-800">
                            {st.prefix}
                            {st.first_name} {st.last_name}
                            {st.nickname && (
                              <span className="text-rose-500 font-normal ml-1">
                                ({st.nickname})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            เลขประจำตัว: {st.student_id}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-rose-500" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Step 2: Select Severity & Rule */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 transition-all">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-sm font-bold">
                2
              </span>
              ระบุความผิดและระดับความรุนแรง
            </h2>

            {/* Reason / Incident */}
            <div className="mb-4">
              <label
                htmlFor="incidentInput"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                สาเหตุ / รายละเอียดพฤติกรรม
              </label>
              <input
                type="text"
                id="incidentInput"
                value={incidentInput}
                onChange={(e) => setIncidentInput(e.target.value)}
                placeholder="เช่น มาสาย, ไม่ส่งการบ้าน, เสียงดังในห้อง"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
              />
            </div>

            {/* Severity Level Grid Selection */}
            <label className="block text-xs font-medium text-slate-600 mb-2">
              ระดับความรุนแรง
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
              {(["low", "medium", "high", "strict"] as SeverityLevel[]).map((key) => {
                const item = severityRules[key];
                const IconComponent = item.icon;
                const isActive = selectedSeverity === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedSeverity(key)}
                    className={`severity-btn border-2 p-3 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                      isActive
                        ? `${item.activeBorder} ${item.activeBg}`
                        : `border-slate-200 ${item.borderClass} bg-slate-50`
                    }`}
                  >
                    <IconComponent className={`h-5 w-5 ${item.iconColor} mb-1`} />
                    <span className="text-xs font-bold text-slate-700">{item.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Automatic Punishment Display */}
            <div className="bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200/60 rounded-xl p-4 flex items-center justify-between mb-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-rose-500 font-bold text-lg">
                  <Gavel className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">บทลงโทษที่ได้รับ (อัตโนมัติ)</div>
                  <div className="font-bold text-slate-800 text-sm sm:text-base">
                    <span className={severityRules[selectedSeverity].textClass}>
                      {severityRules[selectedSeverity].punishment}
                    </span>{" "}
                    <span className="text-xs text-slate-400 font-normal">
                      ({severityRules[selectedSeverity].title})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleSaveRecord()}
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl font-medium text-sm shadow-md hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{isPending ? "กำลังบันทึก..." : "บันทึกบทลงโทษ"}</span>
            </button>
          </div>
        </section>

        {/* Right Column: Penalty History (5 cols) */}
        <section className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 flex-grow flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <History className="h-4 w-4 text-rose-500" />
                <span>ประวัติการลงโทษ</span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  title="ดาวน์โหลด Excel"
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Excel</span>
                </button>
                <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                  {records.length} รายการ
                </span>
              </div>
            </div>

            {/* History List */}
            <div className="space-y-3 overflow-y-auto custom-scrollbar flex-grow max-h-[500px] lg:max-h-[600px] pr-1">
              {records.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <FolderOpen className="h-8 w-8 mb-2 text-slate-300" />
                  <span>ยังไม่มีประวัติการลงโทษ</span>
                </div>
              ) : (
                records.map((rec) => {
                  const rule = severityRules[rec.severity] || severityRules.medium;
                  return (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-sm flex flex-col space-y-2 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-800">
                            เลขที่ {rec.student_no} {rec.student_name}
                            {rec.student_nickname && (
                              <span className="text-rose-500 ml-1">
                                ({rec.student_nickname})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            รหัส: {rec.student_id}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rule.badgeBg} ${rule.textClass}`}
                        >
                          {rec.severity_title}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                        <div className="font-semibold text-slate-700 flex items-center gap-1.5 mb-0.5">
                          <Gavel className="h-3.5 w-3.5 text-rose-500" />
                          <span>
                            บทลงโทษ: <span className={rule.textClass}>{rec.punishment}</span>
                          </span>
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          <span className="font-medium text-slate-600">สาเหตุ:</span>{" "}
                          {rec.incident}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(rec.created_at).toLocaleString("th-TH")}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer"
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
        </section>

      </main>
    </>
  );
}
