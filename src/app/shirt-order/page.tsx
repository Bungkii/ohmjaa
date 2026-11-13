"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Upload,
  Receipt,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  QrCode,
  FileCheck,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import fallbackStudents from "@/data/students.json";
import { Student } from "@/types/penalty";
import { ShirtSize, StudentShirtInfo } from "@/types/activities";

// ตารางขนาดไซส์เสื้อ อ้างอิงตามรูปภาพที่กำหนด
// SIZE: XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL
// CHEST: 34, 36, 38, 40, 42, 44, 46, 48, 50 นิ้ว
// LONG: 25, 26, 27, 28, 29, 30, 31, 32, 33 นิ้ว
const SHIRT_SIZES_GUIDE: { size: ShirtSize; chest: string; length: string; price: number }[] = [
  { size: "XS", chest: "34", length: "25", price: 200 },
  { size: "S", chest: "36", length: "26", price: 200 },
  { size: "M", chest: "38", length: "27", price: 200 },
  { size: "L", chest: "40", length: "28", price: 200 },
  { size: "XL", chest: "42", length: "29", price: 200 },
  { size: "2XL", chest: "44", length: "30", price: 200 },
  { size: "3XL", chest: "46", length: "31", price: 220 }, // เกิน 2XL คิดเพิ่มไซส์ละ 20 บาท
  { size: "4XL", chest: "48", length: "32", price: 240 },
  { size: "5XL", chest: "50", length: "33", price: 260 },
];

export const getShirtUnitPrice = (size: ShirtSize): number => {
  if (size === "3XL") return 220;
  if (size === "4XL") return 240;
  if (size === "5XL") return 260;
  if (size === "Other") return 260;
  return 200; // XS, S, M, L, XL, 2XL = 200 บาท
};

const PROMPTPAY_ACCOUNT = "0987654321";
const PROMPTPAY_ACCOUNT_NAME = "บัญชีกองกลางห้อง ม.2/3 (คุณครูประจำชั้น)";

// กำหนดเวลาหมดเขตสั่งเสื้อ: 20 พฤศจิกายน 2569 เวลา 23:59:59 น. (Asia/Bangkok = UTC+7)
const SHIRT_ORDER_DEADLINE_MS = new Date("2026-11-20T23:59:59+07:00").getTime();
const SHIRT_ORDER_DEADLINE_TEXT = "20 พ.ย. 2569 เวลา 23:59 น.";

export default function ShirtOrderPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form Fields
  const [selectedSize, setSelectedSize] = useState<ShirtSize>("M");
  const [quantity, setQuantity] = useState<number>(1);
  const [customSize, setCustomSize] = useState<string>("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [orderNote, setOrderNote] = useState("");

  // Payment Slip
  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [slipFileName, setSlipFileName] = useState<string>("");
  const [isUploadingSlip, setIsUploadingSlip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Multi-step Flow: step 1 (กรอกข้อมูลสั่งเสื้อ) -> step 2 (หน้าชำระเงิน & แนบสลิป) -> step 3 (สำเร็จ)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingOrder, setHasExistingOrder] = useState(false);
  const [copiedPromptPay, setCopiedPromptPay] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    setIsExpired(Date.now() > SHIRT_ORDER_DEADLINE_MS);
  }, []);

  useEffect(() => {
    try {
      const list = (fallbackStudents as unknown) as Student[];
      const sorted = [...list].sort((a, b) => a.student_no - b.student_no);
      setStudents(sorted);
    } catch {
      setStudents([]);
    }
  }, []);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return students.filter(
      (s) =>
        s.student_id.toLowerCase().includes(q) ||
        s.student_no.toString() === q ||
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.full_name.toLowerCase().includes(q) ||
        (s.nickname && s.nickname.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery("");

    try {
      const saved = localStorage.getItem("ohmjaa_shirt_sizes_v1");
      if (saved) {
        const records = JSON.parse(saved);
        if (records[student.student_id]) {
          const rec: StudentShirtInfo = records[student.student_id];
          setSelectedSize(rec.size || "M");
          setQuantity(rec.quantity || 1);
          if (rec.custom_size) setCustomSize(rec.custom_size);
          if (rec.parent_name) setParentName(rec.parent_name);
          if (rec.parent_phone) setParentPhone(rec.parent_phone);
          if (rec.note) setOrderNote(rec.note);
          if (rec.slip_url) setSlipImage(rec.slip_url);
          setHasExistingOrder(true);
          toast("พบข้อมูลการสั่งที่เคยบันทึกไว้ ท่านสามารถแก้ไขได้", { icon: "ℹ️" });
          return;
        }
      }
    } catch {}
    setHasExistingOrder(false);
  };

  const unitPrice = getShirtUnitPrice(selectedSize);
  const totalPrice = unitPrice * Math.max(1, quantity);

  const promptPayQrUrl = useMemo(() => {
    const acc = PROMPTPAY_ACCOUNT.replace(/[^0-9]/g, "");
    return `https://promptpay.io/${acc}/${totalPrice}.png`;
  }, [totalPrice]);

  const handleCopyPromptPay = async () => {
    try {
      await navigator.clipboard.writeText(PROMPTPAY_ACCOUNT);
      setCopiedPromptPay(true);
      toast.success("คัดลอกเลขพร้อมเพย์แล้ว");
      setTimeout(() => setCopiedPromptPay(false), 2000);
    } catch {
      toast.error("ไม่สามารถคัดลอกได้");
    }
  };

  const handleSlipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาเลือกไฟล์รูปภาพสลิป");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("ไฟล์ต้องไม่เกิน 10 MB");
      return;
    }

    setSlipFileName(file.name);

    // สร้าง local preview ทันทีเพื่อให้ผู้ใช้เห็นรูป
    const localReader = new FileReader();
    localReader.onload = () => {
      setSlipImage(localReader.result as string);
    };
    localReader.readAsDataURL(file);

    // อัปโหลดไฟล์สลิปขึ้น Cloudflare Storage (https://storage.cnintercon.tech/)
    setIsUploadingSlip(true);
    const toastId = toast.loading("กำลังอัปโหลดสลิปไปยังระบบคลาวด์...");
    try {
      const formData = new FormData();
      formData.append("file", file, file.name);

      const res = await fetch("https://storage.cnintercon.tech/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        if (result.url) {
          setSlipImage(result.url);
          toast.success("อัปโหลดสลิปสำเร็จเรียบร้อย", { id: toastId });
        } else {
          toast.success("แนบรูปสลิปแล้ว", { id: toastId });
        }
      } else {
        toast.success("แนบรูปสลิปแล้ว (บันทึกรูปในเครื่อง)", { id: toastId });
      }
    } catch {
      toast.success("แนบรูปสลิปแล้ว", { id: toastId });
    } finally {
      setIsUploadingSlip(false);
    }
  };

  // Step 1 -> Step 2 Validation
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (Date.now() > SHIRT_ORDER_DEADLINE_MS) {
      toast.error("ฟอร์มนี้หมดอายุแล้ว กรุณาติดต่อผู้ดูแลระบบ");
      setIsExpired(true);
      return;
    }
    if (!selectedStudent) {
      toast.error("กรุณาเลือกนักเรียน");
      return;
    }
    if (!selectedSize) {
      toast.error("กรุณาเลือกไซส์เสื้อ");
      return;
    }
    if (selectedSize === "Other" && !customSize.trim()) {
      toast.error("กรุณาระบุขนาดรอบอกไซส์พิเศษ");
      return;
    }

    // เลื่อนไปหน้าชำระเงิน
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Step 2 Final Submit
  const handleFinalSubmitOrder = async () => {
    if (Date.now() > SHIRT_ORDER_DEADLINE_MS) {
      toast.error("ฟอร์มนี้หมดอายุแล้ว กรุณาติดต่อผู้ดูแลระบบ");
      setIsExpired(true);
      return;
    }
    if (!selectedStudent) return;

    setIsSubmitting(true);

    const newInfo: StudentShirtInfo = {
      student_id: selectedStudent.student_id,
      size: selectedSize,
      quantity: quantity || 1,
      custom_size: selectedSize === "Other" ? customSize.trim() : undefined,
      parent_name: parentName.trim() || undefined,
      parent_phone: parentPhone.trim() || undefined,
      note: orderNote.trim() || undefined,
      slip_url: slipImage || undefined,
      ordered_at: new Date().toISOString(),
    };

    try {
      const saved = localStorage.getItem("ohmjaa_shirt_sizes_v1");
      const records: Record<string, StudentShirtInfo> = saved ? JSON.parse(saved) : {};
      records[selectedStudent.student_id] = newInfo;
      localStorage.setItem("ohmjaa_shirt_sizes_v1", JSON.stringify(records));
    } catch {}

    try {
      await fetch("/api/shirt-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudent.student_id,
          student_no: selectedStudent.student_no,
          student_name: `${selectedStudent.prefix}${selectedStudent.first_name} ${selectedStudent.last_name}`,
          student_nickname: selectedStudent.nickname || null,
          size: selectedSize,
          quantity: quantity || 1,
          custom_size: selectedSize === "Other" ? customSize.trim() : null,
          unit_price: unitPrice,
          total_price: totalPrice,
          parent_name: parentName.trim() || null,
          parent_phone: parentPhone.trim() || null,
          note: orderNote.trim() || null,
          slip_url: slipImage || null,
        }),
      });
    } catch {}

    setIsSubmitting(false);
    setCurrentStep(3);
    toast.success("บันทึกการสั่งซื้อเรียบร้อย");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetForm = () => {
    setSelectedStudent(null);
    setSelectedSize("M");
    setQuantity(1);
    setCustomSize("");
    setParentName("");
    setParentPhone("");
    setOrderNote("");
    setSlipImage(null);
    setSlipFileName("");
    setCurrentStep(1);
    setHasExistingOrder(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#f1f3f4] text-slate-800 antialiased font-sans pb-16">
      <Toaster position="top-center" />

      {/* Top Header Strip / Theme band */}
      <div className="h-3 w-full bg-[#a31e1e]" />

      {/* Main Container - Google Form card structure */}
      <main className="max-w-xl mx-auto px-3 sm:px-4 pt-4 space-y-4">
        {/* Header Card with top color accent & Step Indicator */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs relative">
          <div className="h-2.5 bg-[#a31e1e] w-full" />
          <div className="p-5 sm:p-6 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  แบบฟอร์มสั่งเสื้อห้อง ม.2/3
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  โรงเรียนอัสสัมชัญธนบุรี • ปีการศึกษา 2569
                </p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-[#a31e1e] border border-rose-200">
                เริ่มต้น 200.-
              </span>
            </div>

            {/* Stepper Wizard Bar */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    currentStep === 1
                      ? "bg-[#a31e1e] text-white ring-2 ring-rose-200"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
                </span>
                <span className={`font-semibold ${currentStep === 1 ? "text-slate-900" : "text-slate-500"}`}>
                  1. เลือกไซส์ & ข้อมูลผู้สั่ง
                </span>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-300" />

              <div className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    currentStep === 2
                      ? "bg-[#a31e1e] text-white ring-2 ring-rose-200"
                      : currentStep === 3
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                >
                  {currentStep === 3 ? <Check className="w-3.5 h-3.5" /> : "2"}
                </span>
                <span className={`font-semibold ${currentStep === 2 ? "text-slate-900" : "text-slate-400"}`}>
                  2. ชำระเงิน & แนบสลิป
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
              <span>⏰ ปิดรับแบบฟอร์ม: {SHIRT_ORDER_DEADLINE_TEXT}</span>
              {currentStep === 1 && <span className="text-rose-600 font-medium">* จำเป็นต้องระบุ</span>}
            </div>
          </div>
        </div>

        {/* Expired State */}
        {isExpired ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-rose-50 text-[#a31e1e] flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                ฟอร์มนี้หมดอายุแล้ว
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                กรุณาติดต่อผู้ดูแลระบบ
              </p>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-200 max-w-md mx-auto">
              ฟอร์มนี้หมดอายุแล้ว กรุณาติดต่อผู้ดูแลระบบ (หมดเขต {SHIRT_ORDER_DEADLINE_TEXT})
            </p>
          </div>
        ) : currentStep === 1 ? (
          /* ================= STEP 1: ORDER DETAILS ================= */
          <form onSubmit={handleProceedToPayment} className="space-y-4">
            {/* Card 1: Student Selection */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-900">
                  เลือกนักเรียน <span className="text-rose-600 font-bold">*</span>
                </label>
                {selectedStudent && (
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="text-xs text-[#a31e1e] hover:underline cursor-pointer font-medium"
                  >
                    เปลี่ยนคน
                  </button>
                )}
              </div>

              {!selectedStudent ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="พิมพ์เลขประจำตัว, เลขที่ หรือชื่อนักเรียน..."
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#a31e1e]/20 focus:border-[#a31e1e] transition-all"
                      autoFocus
                    />
                  </div>

                  {filteredStudents.length > 0 && (
                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-56 overflow-y-auto bg-white shadow-xs">
                      {filteredStudents.map((s) => (
                        <button
                          key={s.student_id}
                          type="button"
                          onClick={() => handleSelectStudent(s)}
                          className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-rose-50/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-500 w-7">
                              #{s.student_no}
                            </span>
                            <span className="text-xs sm:text-sm font-medium text-slate-800">
                              {s.prefix}{s.first_name} {s.last_name}
                              {s.nickname && <span className="text-slate-400 font-normal ml-1">({s.nickname})</span>}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">{s.student_id}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchQuery.trim() && filteredStudents.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-xs">
                      ไม่พบข้อมูลนักเรียนตามคำค้นหา
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-rose-50/40 border border-rose-200 rounded-lg p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      เลขที่ {selectedStudent.student_no} • {selectedStudent.prefix}{selectedStudent.first_name} {selectedStudent.last_name}
                      {selectedStudent.nickname && <span className="text-slate-600 font-normal ml-1">({selectedStudent.nickname})</span>}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      รหัสประจำตัว: {selectedStudent.student_id} • ห้อง ม.2/3
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-[#a31e1e] shrink-0" />
                </div>
              )}
            </div>

            {/* Card 2: Size Chart (Reference) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">
                  ตารางขนาดไซส์เสื้อ (นิ้ว)
                </span>
                <span className="text-[11px] text-slate-500">
                  รอบอก / ความยาว
                </span>
              </div>

              {/* Exact measurements table matching uploaded image */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
                <table className="w-full text-center border-collapse text-xs min-w-[340px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                      <th className="py-2 px-1.5 text-left pl-3 text-[11px]">SIZE</th>
                      {SHIRT_SIZES_GUIDE.map((g) => (
                        <th key={g.size} className="py-2 px-1 text-[11px]">{g.size}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 px-1.5 text-left pl-3 font-semibold text-slate-600 text-[11px] bg-slate-50/50">CHEST (อก)</td>
                      {SHIRT_SIZES_GUIDE.map((g) => (
                        <td key={g.size} className="py-2 px-1 font-mono text-[11px]">{g.chest}&quot;</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 px-1.5 text-left pl-3 font-semibold text-slate-600 text-[11px] bg-slate-50/50">LONG (ยาว)</td>
                      {SHIRT_SIZES_GUIDE.map((g) => (
                        <td key={g.size} className="py-2 px-1 font-mono text-[11px]">{g.length}&quot;</td>
                      ))}
                    </tr>
                    <tr className="bg-rose-50/70 font-bold text-[#a31e1e]">
                      <td className="py-2 px-1.5 text-left pl-3 text-[11px]">ราคา (บาท)</td>
                      {SHIRT_SIZES_GUIDE.map((g) => (
                        <td key={g.size} className="py-2 px-1 text-[11px]">{g.price}.-</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card 3: Size Selection */}
            <div className={`bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3 transition-opacity ${!selectedStudent ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-900">
                  เลือกไซส์ที่ต้องการ <span className="text-rose-600 font-bold">*</span>
                </label>
                <span className="text-xs font-semibold text-[#a31e1e]">
                  ราคา {unitPrice} บาท/ตัว
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SHIRT_SIZES_GUIDE.map((item) => {
                  const isChecked = selectedSize === item.size;
                  return (
                    <label
                      key={item.size}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-rose-50/60 border-[#a31e1e] ring-1 ring-[#a31e1e]"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="shirt_size"
                        value={item.size}
                        checked={isChecked}
                        onChange={() => setSelectedSize(item.size)}
                        className="accent-[#a31e1e] w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                          <span>{item.size}</span>
                          <span className={isChecked ? "text-[#a31e1e]" : "text-slate-500 font-normal"}>
                            {item.price}.-
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          อก {item.chest}&quot; ยาว {item.length}&quot;
                        </div>
                      </div>
                    </label>
                  );
                })}

                {/* Other / Special Size */}
                <label
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    selectedSize === "Other"
                      ? "bg-rose-50/60 border-[#a31e1e] ring-1 ring-[#a31e1e]"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="shirt_size"
                    value="Other"
                    checked={selectedSize === "Other"}
                    onChange={() => setSelectedSize("Other")}
                    className="accent-[#a31e1e] w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>ไซส์พิเศษ</span>
                      <span className={selectedSize === "Other" ? "text-[#a31e1e]" : "text-slate-500 font-normal"}>
                        260.-
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      ระบุขนาดเอง
                    </div>
                  </div>
                </label>
              </div>

              {selectedSize === "Other" && (
                <div className="pt-2">
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    ระบุขนาดรอบอกไซส์พิเศษ <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={customSize}
                    onChange={(e) => setCustomSize(e.target.value)}
                    placeholder="เช่น รอบอก 54 นิ้ว หรือความยาวพิเศษ..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#a31e1e]/20 focus:border-[#a31e1e]"
                    required
                  />
                </div>
              )}
            </div>

            {/* Card 4: Quantity & Price */}
            <div className={`bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3 transition-opacity ${!selectedStudent ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-slate-900 block">
                    จำนวนเสื้อที่ต้องการสั่ง <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <span className="text-xs text-slate-500">ระบุจำนวนตัว (ตัวละ {unitPrice} บาท)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-bold font-mono text-slate-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm cursor-pointer transition-colors"
                  >
                    +
                  </button>
                  <span className="text-xs text-slate-500">ตัว</span>
                </div>
              </div>

              {/* Total Calculation Strip */}
              <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">
                  ยอดรวมทั้งหมด ({quantity} ตัว × {unitPrice} บาท):
                </span>
                <span className="text-base font-bold text-[#a31e1e]">
                  {totalPrice.toLocaleString()} บาท
                </span>
              </div>
            </div>

            {/* Card 5: Contact Info */}
            <div className={`bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3 transition-opacity ${!selectedStudent ? "opacity-50 pointer-events-none" : ""}`}>
              <div>
                <label className="text-sm font-semibold text-slate-900 block">
                  ข้อมูลผู้สั่งเสื้อ
                </label>
                <span className="text-xs text-slate-500">
                  กรอกข้อมูลติดต่อเพื่อความสะดวกในการประสานงาน (ไม่บังคับ)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    ชื่อผู้ปกครอง / ผู้สั่ง
                  </label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="เช่น คุณแม่วรรณา"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#a31e1e]/20 focus:border-[#a31e1e]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#a31e1e]/20 focus:border-[#a31e1e]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  หมายเหตุเพิ่มเติม
                </label>
                <input
                  type="text"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="เช่น ต้องการปักชื่อเพิ่ม หรือข้อมูลอื่น ๆ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#a31e1e]/20 focus:border-[#a31e1e]"
                />
              </div>
            </div>

            {/* Bottom Actions -> Go to Next Step (Payment) */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="submit"
                disabled={!selectedStudent}
                className="px-6 py-2.5 bg-[#a31e1e] hover:bg-[#881919] disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-2"
              >
                <span>ถัดไป: ชำระเงิน ({totalPrice.toLocaleString()} บาท)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {selectedStudent && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ล้างข้อมูลแบบฟอร์ม
                </button>
              )}
            </div>
          </form>
        ) : currentStep === 2 ? (
          /* ================= STEP 2: PAYMENT & SLIP ATTACHMENT ================= */
          <div className="space-y-4">
            {/* Order Summary Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-[#a31e1e]" />
                  <span>สรุปรายการสั่งซื้อ</span>
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-[#a31e1e] hover:underline cursor-pointer font-medium flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>แก้ไขข้อมูล</span>
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">นักเรียน:</span>
                  <span className="font-bold text-slate-800">
                    {selectedStudent?.prefix}{selectedStudent?.first_name} {selectedStudent?.last_name} (เลขที่ #{selectedStudent?.student_no})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ไซส์เสื้อ:</span>
                  <span className="font-bold text-slate-800">
                    {selectedSize === "Other" ? `พิเศษ (${customSize})` : selectedSize}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">จำนวน:</span>
                  <span className="font-bold text-slate-800">{quantity} ตัว (ตัวละ {unitPrice} บาท)</span>
                </div>
                {parentName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">ผู้สั่ง:</span>
                    <span className="text-slate-700">{parentName} {parentPhone && `(${parentPhone})`}</span>
                  </div>
                )}
                {orderNote && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">หมายเหตุ:</span>
                    <span className="text-slate-700">{orderNote}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-900">ยอดที่ต้องชำระ:</span>
                  <span className="text-lg font-bold text-[#a31e1e] font-mono">
                    ฿{totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* PromptPay QR Code Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs text-center space-y-4">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800">
                <QrCode className="w-4 h-4 text-[#a31e1e]" />
                <span>สแกน QR Code เพื่อชำระเงิน</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 inline-block mx-auto max-w-xs w-full">
                <img
                  src={promptPayQrUrl}
                  alt="QR พร้อมเพย์"
                  className="w-48 h-48 mx-auto rounded-lg bg-white p-1 border border-slate-200 shadow-xs"
                />
                <div className="mt-3 text-center">
                  <span className="text-xs text-slate-500 block">ยอดชำระตามยอดสั่งซื้อ</span>
                  <span className="text-2xl font-bold text-[#a31e1e] font-mono">
                    ฿{totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 text-left border border-slate-200 text-xs space-y-1.5 max-w-sm mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-500">ชื่อบัญชี:</span>
                  <span className="font-medium text-slate-800">{PROMPTPAY_ACCOUNT_NAME}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">พร้อมเพย์:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900">{PROMPTPAY_ACCOUNT}</span>
                    <button
                      type="button"
                      onClick={handleCopyPromptPay}
                      className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                      title="คัดลอกเบอร์"
                    >
                      {copiedPromptPay ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Slip Upload Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div>
                <label className="text-sm font-semibold text-slate-900 block">
                  แนบหลักฐานสลิปการโอนเงิน (ถ้ามี)
                </label>
                <span className="text-xs text-slate-500">
                  ท่านสามารถแนบสลิปตอนนี้ หรือส่งให้ครูประจำชั้นภายหลังได้
                </span>
              </div>

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleSlipChange}
                className="hidden"
              />

              {!slipImage ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingSlip}
                  className="w-full py-4 border-2 border-dashed border-rose-200 hover:border-[#a31e1e] bg-rose-50/20 hover:bg-rose-50/40 rounded-xl text-xs text-slate-600 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-60"
                >
                  {isUploadingSlip ? (
                    <>
                      <RefreshCw className="w-5 h-5 text-[#a31e1e] animate-spin" />
                      <span className="font-semibold text-slate-800">กำลังอัปโหลดรูปภาพสลิปไปยังเซิร์ฟเวอร์...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-[#a31e1e]" />
                      <span className="font-semibold text-slate-800">กดเพื่ออัปโหลดสลิปการโอนเงิน</span>
                      <span className="text-[11px] text-slate-400">รองรับไฟล์ JPG, PNG (อัปโหลดเข้าคลาวด์อัตโนมัติ)</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="bg-rose-50/40 border border-rose-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs truncate">
                    <img src={slipImage} alt="สลิป" className="w-12 h-12 object-cover rounded-md border border-rose-200 shrink-0 bg-white" />
                    <div className="truncate">
                      <span className="font-semibold text-slate-800 block truncate">{slipFileName || "สลิปโอนเงิน"}</span>
                      <span className="text-[11px] text-emerald-700 flex items-center gap-1 mt-0.5">
                        <Check className="w-3 h-3" />
                        <span>{slipImage.startsWith("http") ? "อัปโหลดขึ้นคลาวด์เรียบร้อย" : "แนบไฟล์เรียบร้อย"}</span>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSlipImage(null);
                      setSlipFileName("");
                    }}
                    className="text-xs text-rose-600 hover:underline cursor-pointer ml-3 shrink-0 font-medium"
                  >
                    เปลี่ยนรูป / ลบ
                  </button>
                </div>
              )}
            </div>

            {/* Submit & Back Action Buttons */}
            <div className="flex items-center justify-between pt-1 gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>ย้อนกลับ</span>
              </button>

              <button
                type="button"
                onClick={handleFinalSubmitOrder}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-[#a31e1e] hover:bg-[#881919] disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังยืนยันการสั่งซื้อ...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>ยืนยันคำสั่งซื้อ ({totalPrice.toLocaleString()} บาท)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ================= STEP 3: SUBMISSION COMPLETED ================= */
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                ระบบได้บันทึกคำสั่งซื้อเรียบร้อยแล้ว
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                ขอบคุณสำหรับการสั่งเสื้อห้อง ม.2/3 โรงเรียนอัสสัมชัญธนบุรี
              </p>
            </div>

            {/* Summary Details */}
            <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-200 text-xs space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-500">นักเรียน:</span>
                <span className="font-bold text-slate-800">
                  {selectedStudent?.prefix}{selectedStudent?.first_name} {selectedStudent?.last_name} (#{selectedStudent?.student_no})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ขนาดไซส์ & จำนวน:</span>
                <span className="font-bold text-slate-800">
                  ไซส์ {selectedSize === "Other" ? customSize : selectedSize} ({quantity} ตัว)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ยอดชำระ:</span>
                <span className="font-bold text-[#a31e1e] font-mono text-sm">
                  {totalPrice.toLocaleString()} บาท
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">สถานะสลิป:</span>
                <span className={slipImage ? "text-emerald-700 font-medium" : "text-amber-700 font-medium"}>
                  {slipImage ? "แนบสลิปเรียบร้อย" : "ยังไม่ได้แนบสลิป"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                สั่งซื้อเพิ่มอีกคน
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-[#a31e1e] text-white text-xs font-medium hover:bg-[#881919] cursor-pointer"
              >
                พิมพ์ใบสั่งซื้อ
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-slate-400 mt-10">
        แบบฟอร์มสั่งเสื้อห้อง ม.2/3 • โรงเรียนอัสสัมชัญธนบุรี
      </footer>
    </div>
  );
}
