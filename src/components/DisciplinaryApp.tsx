"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
  Gavel,
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Leaf,
  PlusCircle,
  Clock,
  Trash2,
  Users,
  Activity,
  History,
  Check,
  TrendingUp,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Student, PenaltyRecord, SeverityLevel, SEVERITY_RULES } from "@/types/penalty";
import { Card, CardHeader, CardTitle, Badge, Button, MetricCard } from "@/components/ui";
import { createPenaltyRecord, deletePenaltyRecord } from "@/app/actions";

interface DisciplinaryAppProps {
  initialStudents: Student[];
  initialRecords: PenaltyRecord[];
}

export default function DisciplinaryApp({
  initialStudents,
  initialRecords,
}: DisciplinaryAppProps) {
  const [students] = useState<Student[]>(initialStudents);
  const [records, setRecords] = useState<PenaltyRecord[]>(initialRecords);

  // Form states
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [incidentText, setIncidentText] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel>("medium");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Filtered students
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.student_id.toLowerCase().includes(q) ||
        s.student_no.toString().includes(q) ||
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.full_name.toLowerCase().includes(q) ||
        (s.nickname && s.nickname.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  // Analytics
  const stats = useMemo(() => {
    const total = records.length;
    const severeCount = records.filter(
      (r) => r.severity === "high" || r.severity === "strict"
    ).length;
    const studentsInvolved = new Set(records.map((r) => r.student_id)).size;
    return { total, severeCount, studentsInvolved };
  }, [records]);

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Submit record
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      showToast("กรุณาเลือกลูกศิษย์ก่อนบันทึก");
      return;
    }
    if (!incidentText.trim()) {
      showToast("กรุณาระบุสาเหตุหรือพฤติกรรม");
      return;
    }

    const rule = SEVERITY_RULES[selectedSeverity];

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
      showToast(`บันทึกบทลงโทษ ${selectedStudent.first_name} สำเร็จแล้ว`);
    });
  };

  // Delete record
  const handleDelete = (id: string, name: string) => {
    if (!confirm(`ต้องการลบรายการของ ${name} ใช่หรือไม่?`)) return;

    startTransition(async () => {
      await deletePenaltyRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      showToast("ลบรายการประวัติแล้ว");
    });
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (records.length === 0) {
      showToast("ยังไม่มีข้อมูลสำหรับส่งออกเป็น Excel");
      return;
    }

    const dataToExport = records.map((r, idx) => ({
      ลำดับ: idx + 1,
      รหัสนักเรียน: r.student_id,
      เลขที่: r.student_no,
      ชื่อ_นามสกุล: r.student_name,
      ชื่อเล่น: r.student_nickname || "-",
      ระดับความรุนแรง: r.severity_title,
      สาเหตุ_พฤติกรรม: r.incident,
      บทลงโทษที่ได้รับ: r.punishment,
      สถานะ: r.status,
      วันที่บันทึก: new Date(r.created_at).toLocaleString("th-TH"),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "บันทึกบทลงโทษ");

    const todayStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `ohmjaa_penalties_${todayStr}.xlsx`);
    showToast("ส่งออกไฟล์ Excel สำเร็จแล้ว");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex-grow space-y-6">
        
        {/* Tremor-style Analytics KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            title="บันทึกบทลงโทษทั้งหมด"
            value={`${stats.total} ครั้ง`}
            subtext="อัปเดตแบบเรียลไทม์"
            icon={Activity}
            colorClass="text-rose-500 bg-rose-50"
          />
          <MetricCard
            title="นักเรียนที่มีบันทึกพฤติกรรม"
            value={`${stats.studentsInvolved} คน`}
            subtext={`จากทั้งหมด ${students.length} คนในห้อง ม.2/3`}
            icon={Users}
            colorClass="text-amber-600 bg-amber-50"
          />
          <MetricCard
            title="เคสรุนแรง / เข้าห้องปกครอง"
            value={`${stats.severeCount} เคส`}
            subtext="ระดับสูงและส่งต่อฝ่ายปกครอง"
            icon={TrendingUp}
            colorClass="text-purple-600 bg-purple-50"
          />
        </div>

        {/* Content Layout (7 cols Form / 5 cols History) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1: Student Selection */}
            <Card className="border-rose-100/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-sm font-bold">
                    1
                  </span>
                  เลือกลูกศิษย์ ม.2/3
                </CardTitle>
                <Badge variant={selectedStudent ? "success" : "secondary"}>
                  {selectedStudent
                    ? `เลขที่ ${selectedStudent.student_no} ${selectedStudent.first_name}`
                    : "ยังไม่ได้เลือก"}
                </Badge>
              </CardHeader>

              {/* Search Box */}
              <div className="relative mb-3.5">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาตามชื่อ, ชื่อเล่น, นามสกุล หรือ เลขประจำตัว..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
                />
              </div>

              {/* Student List */}
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {filteredStudents.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    ไม่พบข้อมูลนักเรียนที่ค้นหา
                  </div>
                ) : (
                  filteredStudents.map((st) => {
                    const isSelected = selectedStudent?.student_id === st.student_id;
                    return (
                      <button
                        key={st.student_id}
                        type="button"
                        onClick={() => setSelectedStudent(st)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-rose-50/90 border-rose-300 ring-2 ring-rose-400/30"
                            : "bg-white hover:bg-slate-50 border-slate-200/80"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                              isSelected
                                ? "bg-rose-500 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {st.student_no}
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-slate-800">
                              {st.prefix}
                              {st.first_name} {st.last_name}
                              {st.nickname && (
                                <span className="text-rose-600 ml-1.5 font-normal">
                                  ({st.nickname})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              รหัสนักเรียน: {st.student_id}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Step 2: Severity & Reason */}
            <Card className="border-rose-100/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-sm font-bold">
                    2
                  </span>
                  ระบุความผิดและระดับความรุนแรง
                </CardTitle>
              </CardHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Reason Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    สาเหตุ / รายละเอียดพฤติกรรม
                  </label>
                  <input
                    type="text"
                    value={incidentText}
                    onChange={(e) => setIncidentText(e.target.value)}
                    placeholder="เช่น มาสาย, ไม่ส่งงานวิชาคณิต, ส่งเสียงดังรบกวน, โดดเรียน"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Severity Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    ระดับความรุนแรง
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Low */}
                    <button
                      type="button"
                      onClick={() => setSelectedSeverity("low")}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                        selectedSeverity === "low"
                          ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-200"
                          : "border-slate-200 hover:border-emerald-300 bg-slate-50"
                      }`}
                    >
                      <Leaf className="h-5 w-5 text-emerald-500 mb-1" />
                      <span className="text-xs font-bold text-slate-700">รุนแรงน้อย</span>
                    </button>

                    {/* Medium */}
                    <button
                      type="button"
                      onClick={() => setSelectedSeverity("medium")}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                        selectedSeverity === "medium"
                          ? "border-amber-500 bg-amber-50/80 ring-2 ring-amber-200"
                          : "border-slate-200 hover:border-amber-300 bg-slate-50"
                      }`}
                    >
                      <AlertTriangle className="h-5 w-5 text-amber-500 mb-1" />
                      <span className="text-xs font-bold text-slate-700">รุนแรงกลาง</span>
                    </button>

                    {/* High */}
                    <button
                      type="button"
                      onClick={() => setSelectedSeverity("high")}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                        selectedSeverity === "high"
                          ? "border-rose-500 bg-rose-50/80 ring-2 ring-rose-200"
                          : "border-slate-200 hover:border-rose-300 bg-slate-50"
                      }`}
                    >
                      <Flame className="h-5 w-5 text-rose-500 mb-1" />
                      <span className="text-xs font-bold text-slate-700">รุนแรงมาก</span>
                    </button>

                    {/* Strict */}
                    <button
                      type="button"
                      onClick={() => setSelectedSeverity("strict")}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                        selectedSeverity === "strict"
                          ? "border-purple-600 bg-purple-50/80 ring-2 ring-purple-200"
                          : "border-slate-200 hover:border-purple-300 bg-slate-50"
                      }`}
                    >
                      <ShieldAlert className="h-5 w-5 text-purple-600 mb-1" />
                      <span className="text-xs font-bold text-slate-700">ฝ่ายปกครอง</span>
                    </button>
                  </div>
                </div>

                {/* Calculated Punishment Banner */}
                <div className="rounded-xl border border-rose-200/60 bg-gradient-to-r from-rose-50 to-amber-50 p-4 flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-rose-500 shadow-xs shrink-0">
                    <Gavel className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      บทลงโทษอัตโนมัติตามกฎห้อง
                    </div>
                    <div className="text-sm sm:text-base font-bold text-slate-800">
                      {SEVERITY_RULES[selectedSeverity].punishment}
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={isPending || !selectedStudent}
                  className="w-full h-12 text-sm gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  {isPending ? "กำลังบันทึกข้อมูล..." : "บันทึกบทลงโทษเข้าสู่ระบบ"}
                </Button>
              </form>
            </Card>
          </div>

          {/* Right Column: History Log (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-rose-500" />
                  ประวัติการลงโทษ
                </CardTitle>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    title="ดาวน์โหลดเป็นไฟล์ Excel"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Excel</span>
                  </button>
                  <Badge variant="destructive">{records.length} รายการ</Badge>
                </div>
              </CardHeader>

              {/* Records List */}
              <div className="space-y-3 overflow-y-auto max-h-[580px] pr-1 custom-scrollbar">
                {records.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                    <Clock className="h-8 w-8 text-slate-300 mb-2" />
                    ยังไม่มีประวัติการลงโทษในระบบ
                  </div>
                ) : (
                  records.map((rec) => {
                    const rule = SEVERITY_RULES[rec.severity] || SEVERITY_RULES.medium;
                    const dateFormatted = new Date(rec.created_at).toLocaleString("th-TH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });

                    return (
                      <div
                        key={rec.id}
                        className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-all space-y-2.5"
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
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${rule.badgeBg}`}
                          >
                            {rec.severity_title}
                          </span>
                        </div>

                        {/* Punishment Info */}
                        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100 text-xs">
                          <div className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                            <Gavel className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <span>
                              บทลงโทษ: <span className={rule.textClass}>{rec.punishment}</span>
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            <span className="font-medium text-slate-600">สาเหตุ:</span>{" "}
                            {rec.incident}
                          </div>
                        </div>

                        {/* Footer Time & Delete */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {dateFormatted}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDelete(rec.id, rec.student_name)}
                            className="text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>ลบ</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}

