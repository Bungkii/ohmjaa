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

const BANK_NAME = "ธนาคารกรุงไทย";
const BANK_ACCOUNT_NO = "1370404514";
const BANK_ACCOUNT_NAME = "นางสาวปุณยาพร สิงห์ลอ";
const BANK_LOGO_URL = "/ktb-logo.png";
const SHIRT_PREVIEW_URL = "/shirt-preview.jpg";

// กำหนดเวลาหมดเขตสั่งเสื้อ: 20 พฤศจิกายน 2569 เวลา 23:59:59 น. (Asia/Bangkok = UTC+7)
const SHIRT_ORDER_DEADLINE_MS = new Date("2026-11-20T23:59:59+07:00").getTime();
const SHIRT_ORDER_DEADLINE_TEXT = "20 พ.ย. 2569 เวลา 23:59 น.";

export default function ShirtOrderPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form Fields: รองรับการสั่งหลายไซส์ หลายตัว เช่น L 1 ตัว, M 2 ตัว
  const [sizeQuantities, setSizeQuantities] = useState<Record<ShirtSize, number>>({
    XS: 0,
    S: 0,
    M: 1, // ค่าเริ่มต้น 1 ตัว
    L: 0,
    XL: 0,
    "2XL": 0,
    "3XL": 0,
    "4XL": 0,
    "5XL": 0,
    Other: 0,
    "": 0,
  });
  const [selectedSize, setSelectedSize] = useState<ShirtSize>("M");
  const [quantity, setQuantity] = useState<number>(1);
  const [customSize, setCustomSize] = useState<string>("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [orderNote, setOrderNote] = useState("");

  // Payment Slip & Verification
  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [slipFileName, setSlipFileName] = useState<string>("");
  const [isUploadingSlip, setIsUploadingSlip] = useState(false);
  const [slipVerified, setSlipVerified] = useState<boolean | null>(null);
  const [slipVerifyMessage, setSlipVerifyMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Multi-step Flow: step 1 (กรอกข้อมูลสั่งเสื้อ) -> step 2 (หน้าชำระเงิน & แนบสลิป) -> step 3 (สำเร็จ)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingOrder, setHasExistingOrder] = useState(false);
  const [copiedAccountNo, setCopiedAccountNo] = useState(false);
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

  // คำนวณสรุปรายการเสื้อทั้งหมดที่เลือก
  const orderItems = useMemo(() => {
    return SHIRT_SIZES_GUIDE.map((g) => ({
      size: g.size,
      quantity: sizeQuantities[g.size] || 0,
      unitPrice: g.price,
      total: (sizeQuantities[g.size] || 0) * g.price,
    })).filter((item) => item.quantity > 0);
  }, [sizeQuantities]);

  const totalQuantity = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [orderItems]);

  const totalPrice = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.total, 0);
  }, [orderItems]);

  // สรุปข้อความไซส์ เช่น "M (2 ตัว), L (1 ตัว)"
  const orderSummaryText = useMemo(() => {
    if (orderItems.length === 0) return "ยังไม่ได้เลือกไซส์";
    return orderItems.map((item) => `${item.size} × ${item.quantity}`).join(", ");
  }, [orderItems]);

  const updateSizeQty = (size: ShirtSize, delta: number) => {
    setSizeQuantities((prev) => {
      const current = prev[size] || 0;
      const next = Math.max(0, Math.min(20, current + delta));
      return { ...prev, [size]: next };
    });
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery("");

    try {
      const saved = localStorage.getItem("ohmjaa_shirt_sizes_v1");
      if (saved) {
        const records = JSON.parse(saved);
        if (records[student.student_id]) {
          const rec: StudentShirtInfo = records[student.student_id];
          if (rec.items && Array.isArray(rec.items)) {
            const nextQuantities: Record<ShirtSize, number> = {
              XS: 0, S: 0, M: 0, L: 0, XL: 0, "2XL": 0, "3XL": 0, "4XL": 0, "5XL": 0, Other: 0, "": 0,
            };
            rec.items.forEach((it) => {
              if (it.size) nextQuantities[it.size] = it.quantity || 1;
            });
            setSizeQuantities(nextQuantities);
          } else if (rec.size) {
            setSizeQuantities({
              XS: 0, S: 0, M: 0, L: 0, XL: 0, "2XL": 0, "3XL": 0, "4XL": 0, "5XL": 0, Other: 0, "": 0,
              [rec.size as ShirtSize]: rec.quantity || 1,
            });
          }
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

  const promptPayQrUrl = useMemo(() => {
    const acc = BANK_ACCOUNT_NO.replace(/[^0-9]/g, "");
    return `https://promptpay.io/${acc}/${totalPrice}.png`;
  }, [totalPrice]);

  const handleCopyAccountNo = async () => {
    try {
      await navigator.clipboard.writeText(BANK_ACCOUNT_NO);
      setCopiedAccountNo(true);
      toast.success("คัดลอกเลขบัญชีแล้ว");
      setTimeout(() => setCopiedAccountNo(false), 2000);
    } catch {
      toast.error("ไม่สามารถคัดลอกได้");
    }
  };

  const handleSlipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("รองรับเฉพาะไฟล์ภาพเท่านั้น (JPG, PNG, WebP)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("ไฟล์ต้องไม่เกิน 10 MB");
      return;
    }

    setSlipFileName(file.name);

    // อ่าน base64 ก่อนสำหรับส่งตรวจสอบผ่าน API
    const localReader = new FileReader();
    localReader.onload = async () => {
      const localBase64 = localReader.result as string;
      setSlipImage(localBase64);

      // อัปโหลดไฟล์สลิปขึ้น Cloudflare Storage (https://storage.cnintercon.tech/)
      setIsUploadingSlip(true);
      setSlipVerified(null);
      setSlipVerifyMessage("");
      const toastId = toast.loading("กำลังอัปโหลดและตรวจสอบสลิป...");
      try {
        const formData = new FormData();
        formData.append("file", file, file.name);

        const res = await fetch("https://storage.cnintercon.tech/upload", {
          method: "POST",
          body: formData,
        });

        let finalUrl = localBase64;
        if (res.ok) {
          const result = await res.json();
          if (result.url) {
            finalUrl = result.url;
            setSlipImage(finalUrl);
          }
        }

        // ตรวจสอบความถูกต้องของสลิปผ่าน Slip2Go API
        try {
          const verifyRes = await fetch("/api/verify-slip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: localBase64,
              imageUrl: finalUrl.startsWith("http") ? finalUrl : undefined,
              expectedAmount: totalPrice,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.ok) {
            setSlipVerified(true);
            setSlipVerifyMessage("สลิปถูกต้อง ยอดเงินครบถ้วน");
            toast.success("สลิปถูกต้อง ยืนยันยอดเงินสำเร็จ", { id: toastId });
          } else {
            setSlipVerified(false);
            const errMsg = verifyData.message || "ตรวจสอบสลิปไม่ผ่านหรือไม่พบ QR Code";
            setSlipVerifyMessage(errMsg);
            toast.error(errMsg, { id: toastId });
          }
        } catch {
          setSlipVerified(false);
          setSlipVerifyMessage("ไม่สามารถเชื่อมต่อระบบตรวจสอบสลิปได้");
          toast.error("ตรวจสอบสลิปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", { id: toastId });
        }
      } catch {
        setSlipVerified(false);
        setSlipVerifyMessage("อัปโหลดไฟล์สลิปไม่สำเร็จ");
        toast.error("อัปโหลดไฟล์สลิปไม่สำเร็จ กรุณาลองใหม่", { id: toastId });
      } finally {
        setIsUploadingSlip(false);
      }
    };
    localReader.readAsDataURL(file);
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
    if (totalQuantity === 0 || orderItems.length === 0) {
      toast.error("กรุณาเลือกจำนวนเสื้ออย่างน้อย 1 ตัว");
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

    if (!slipImage) {
      toast.error("กรุณาแนบหลักฐานสลิปการโอนเงิน (เฉพาะไฟล์ภาพ)");
      return;
    }

    if (slipVerified !== true) {
      toast.error("กรุณารอตรวจสอบสลิปให้ผ่าน หรือแนบสลิปที่ถูกต้องก่อนยืนยัน");
      return;
    }

    setIsSubmitting(true);

    const newInfo: StudentShirtInfo = {
      student_id: selectedStudent.student_id,
      size: orderSummaryText,
      quantity: totalQuantity,
      custom_size: selectedSize === "Other" ? customSize.trim() : undefined,
      parent_name: parentName.trim() || undefined,
      parent_phone: parentPhone.trim() || undefined,
      note: orderNote.trim() || undefined,
      slip_url: slipImage || undefined,
      ordered_at: new Date().toISOString(),
      items: orderItems.map((it) => ({
        size: it.size,
        quantity: it.quantity,
        unit_price: it.unitPrice,
      })),
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
          size: orderSummaryText,
          quantity: totalQuantity,
          custom_size: selectedSize === "Other" ? customSize.trim() : null,
          unit_price: orderItems[0]?.unitPrice || 200,
          total_price: totalPrice,
          parent_name: parentName.trim() || null,
          parent_phone: parentPhone.trim() || null,
          note: orderNote.trim() || null,
          slip_url: slipImage || null,
          items: orderItems,
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
    setSizeQuantities({
      XS: 0, S: 0, M: 1, L: 0, XL: 0, "2XL": 0, "3XL": 0, "4XL": 0, "5XL": 0, Other: 0, "": 0,
    });
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
            {/* Card 0: Shirt Design Preview */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    แบบเสื้อห้อง ม.2/3 (STEM-CEL)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    เสื้อโปโรคอวี แดง-ชมพู-ขาว โรงเรียนอัสสัมชัญธนบุรี
                  </p>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 bg-rose-50 text-[#a31e1e] rounded border border-rose-200">
                  แบบจำลอง
                </span>
              </div>
              <div className="p-2 sm:p-3 bg-slate-50 flex items-center justify-center">
                <img
                  src={SHIRT_PREVIEW_URL}
                  alt="แบบเสื้อห้อง ม.2/3"
                  className="w-full max-h-80 sm:max-h-96 object-contain rounded-lg shadow-2xs bg-white"
                />
              </div>
            </div>

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

            {/* Card 3: Size & Quantity Selection (รองรับหลายไซส์ หลายตัว เช่น L 1 ตัว, M 2 ตัว) */}
            <div className={`bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 transition-opacity ${!selectedStudent ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <label className="text-sm font-semibold text-slate-900 block">
                    เลือกไซส์และระบุจำนวนที่ต้องการ <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <span className="text-xs text-slate-500">
                    สามารถกดสั่งหลายไซส์พร้อมกันได้ (เช่น L 1 ตัว, M 2 ตัว)
                  </span>
                </div>
                {totalQuantity > 0 && (
                  <span className="text-xs font-bold text-[#a31e1e] bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                    รวม {totalQuantity} ตัว
                  </span>
                )}
              </div>

              {/* Size rows with +/- stepper for each size */}
              <div className="space-y-2">
                {SHIRT_SIZES_GUIDE.map((item) => {
                  const qty = sizeQuantities[item.size] || 0;
                  const isSelected = qty > 0;
                  return (
                    <div
                      key={item.size}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-rose-50/50 border-[#a31e1e] ring-1 ring-[#a31e1e]/20"
                          : "bg-white border-slate-200 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                          isSelected ? "bg-[#a31e1e] text-white" : "bg-slate-100 text-slate-700"
                        }`}>
                          {item.size}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              ไซส์ {item.size}
                            </span>
                            <span className="text-xs font-semibold text-[#a31e1e]">
                              {item.price} บาท/ตัว
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block">
                            รอบอก {item.chest}&quot; • ความยาว {item.length}&quot;
                          </span>
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateSizeQty(item.size, -1)}
                          disabled={qty === 0}
                          className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold text-sm cursor-pointer transition-colors flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className={`w-8 text-center text-sm font-bold font-mono ${
                          qty > 0 ? "text-[#a31e1e]" : "text-slate-400"
                        }`}>
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateSizeQty(item.size, 1)}
                          className="w-8 h-8 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[#a31e1e] font-bold text-sm cursor-pointer transition-colors flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Summary Strip */}
              <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-slate-600 block">
                    รายการที่เลือก: <strong className="text-slate-900">{orderSummaryText}</strong>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    รวมทั้งสิ้น {totalQuantity} ตัว
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">ยอดรวมทั้งหมด</span>
                  <span className="text-xl font-bold text-[#a31e1e] font-mono">
                    ฿{totalPrice.toLocaleString()}
                  </span>
                </div>
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
                <div className="flex justify-between items-start">
                  <span className="text-slate-500 shrink-0">รายการเสื้อ:</span>
                  <div className="text-right space-y-0.5">
                    {orderItems.map((it) => (
                      <div key={it.size} className="font-bold text-slate-800">
                        ไซส์ {it.size} × {it.quantity} ตัว ({it.total.toLocaleString()} บาท)
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">จำนวนรวมทั้งหมด:</span>
                  <span className="font-bold text-[#a31e1e]">{totalQuantity} ตัว</span>
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

            {/* Bank Payment Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-800">
                <img src={BANK_LOGO_URL} alt="KTB" className="w-5 h-5 rounded-full object-contain shadow-xs" />
                <span>ช่องทางการโอนเงิน / ชำระเงิน</span>
              </div>

              {/* Total Amount Display */}
              <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 max-w-sm mx-auto text-center">
                <span className="text-xs text-slate-500 block">ยอดเงินที่ต้องโอนชำระ</span>
                <span className="text-3xl font-bold text-[#a31e1e] font-mono mt-0.5 block">
                  ฿{totalPrice.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  (รวมทั้งหมด {totalQuantity} ตัว • {orderSummaryText})
                </span>
              </div>

              {/* Bank Account Details Card */}
              <div className="bg-sky-50/60 rounded-xl p-4 text-left border border-sky-100 text-xs space-y-2.5 max-w-sm mx-auto">
                <div className="flex items-center gap-3 pb-2 border-b border-sky-100">
                  <img
                    src={BANK_LOGO_URL}
                    alt="ธนาคารกรุงไทย"
                    className="w-10 h-10 rounded-full bg-white p-1 shadow-xs border border-sky-200 shrink-0"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">{BANK_NAME}</div>
                    <div className="text-[11px] text-sky-800 font-medium">บัญชีเงินฝากออมทรัพย์</div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-slate-500">เลขที่บัญชี:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900 text-sm tracking-wide">
                      {BANK_ACCOUNT_NO}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyAccountNo}
                      className="px-2 py-1 rounded bg-white border border-sky-200 text-sky-800 hover:bg-sky-100 cursor-pointer flex items-center gap-1 text-[11px] font-medium transition-colors"
                      title="คัดลอกเลขบัญชี"
                    >
                      {copiedAccountNo ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>คัดลอก</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-start pt-1 border-t border-sky-100/70">
                  <span className="text-slate-500 shrink-0">ชื่อบัญชี:</span>
                  <span className="font-bold text-slate-900 text-right">{BANK_ACCOUNT_NAME}</span>
                </div>
              </div>
            </div>

            {/* Slip Upload Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-slate-900 block">
                    แนบหลักฐานสลิปการโอนเงิน <span className="text-rose-600 font-bold">* บังคับ</span>
                  </label>
                  <span className="text-xs text-slate-500">
                    รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WebP) และต้องผ่านการตรวจสอบความถูกต้องก่อนยืนยัน
                  </span>
                </div>
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
                      <span className="font-semibold text-slate-800">กำลังอัปโหลดและตรวจสอบสลิป...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-[#a31e1e]" />
                      <span className="font-semibold text-slate-800">กดเพื่ออัปโหลดสลิปการโอนเงิน</span>
                      <span className="text-[11px] text-slate-400">ระบบจะตรวจสอบความถูกต้องของสลิปโดยอัตโนมัติ</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="bg-rose-50/40 border border-rose-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs truncate">
                    <img src={slipImage} alt="สลิป" className="w-12 h-12 object-cover rounded-md border border-rose-200 shrink-0 bg-white" />
                    <div className="truncate">
                      <span className="font-semibold text-slate-800 block truncate">{slipFileName || "สลิปโอนเงิน"}</span>
                      {slipVerified === true ? (
                        <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>ตรวจสอบแล้ว: {slipVerifyMessage || "สลิปถูกต้อง"}</span>
                        </span>
                      ) : slipVerified === false ? (
                        <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1 mt-0.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{slipVerifyMessage || "ตรวจสอบไม่ผ่าน แต่บันทึกสลิปแล้ว"}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-700 flex items-center gap-1 mt-0.5">
                          <Check className="w-3 h-3" />
                          <span>แนบไฟล์เรียบร้อย</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSlipImage(null);
                      setSlipFileName("");
                      setSlipVerified(null);
                      setSlipVerifyMessage("");
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
                disabled={isSubmitting || isUploadingSlip || !slipImage || slipVerified !== true}
                className="flex-1 py-2.5 bg-[#a31e1e] hover:bg-[#881919] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังยืนยันการสั่งซื้อ...</span>
                  </>
                ) : isUploadingSlip ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังตรวจสอบสลิป...</span>
                  </>
                ) : slipVerified !== true ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>ต้องแนบและยืนยันสลิปก่อนสั่งซื้อ</span>
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
                  ไซส์ {selectedSize} ({quantity} ตัว)
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
