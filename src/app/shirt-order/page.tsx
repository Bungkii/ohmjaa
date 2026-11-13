"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Shirt,
  Search,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Phone,
  User,
  Copy,
  Check,
  ShoppingBag,
  Upload,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Receipt,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
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

  // Form State
  const [selectedSize, setSelectedSize] = useState<ShirtSize>("M");
  const [quantity, setQuantity] = useState<number>(1);
  const [customSize, setCustomSize] = useState<string>("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [orderNote, setOrderNote] = useState("");

  // Payment Slip Upload State
  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [slipFileName, setSlipFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Submission & Payment State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasExistingOrder, setHasExistingOrder] = useState(false);
  const [copiedPromptPay, setCopiedPromptPay] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    setIsExpired(Date.now() > SHIRT_ORDER_DEADLINE_MS);
  }, []);

  // Load students data & check existing saved records
  useEffect(() => {
    try {
      const list = (fallbackStudents as unknown) as Student[];
      const sorted = [...list].sort((a, b) => a.student_no - b.student_no);
      setStudents(sorted);
    } catch {
      setStudents([]);
    }
  }, []);

  // Filter students by ID, Name, Number, or Nickname
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
    ).slice(0, 6);
  }, [students, searchQuery]);

  // When a student is selected, check if they already have an existing record
  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery("");
    setHasExistingOrder(false);

    try {
      const saved = localStorage.getItem("ohmjaa_shirt_sizes_v1");
      if (saved) {
        const records: Record<string, StudentShirtInfo> = JSON.parse(saved);
        const existing = records[student.student_id];
        if (existing) {
          if (existing.size) setSelectedSize(existing.size);
          if (existing.quantity) setQuantity(existing.quantity);
          if (existing.custom_size) setCustomSize(existing.custom_size);
          if (existing.parent_name) setParentName(existing.parent_name);
          if (existing.parent_phone) setParentPhone(existing.parent_phone);
          if (existing.note) setOrderNote(existing.note);
          if (existing.slip_url) setSlipImage(existing.slip_url);
          setHasExistingOrder(true);
        }
      }
    } catch {}

    try {
      const res = await fetch(`/api/shirt-orders?student_id=${student.student_id}`);
      const json = await res.json();
      if (json.ok && json.orders && json.orders.length > 0) {
        const serverOrder = json.orders[0];
        if (serverOrder.size) setSelectedSize(serverOrder.size);
        if (serverOrder.quantity) setQuantity(serverOrder.quantity);
        if (serverOrder.custom_size) setCustomSize(serverOrder.custom_size);
        if (serverOrder.parent_name) setParentName(serverOrder.parent_name);
        if (serverOrder.parent_phone) setParentPhone(serverOrder.parent_phone);
        if (serverOrder.note) setOrderNote(serverOrder.note);
        if (serverOrder.slip_url) setSlipImage(serverOrder.slip_url);
        setHasExistingOrder(true);
      }
    } catch {}
  };

  const unitPrice = getShirtUnitPrice(selectedSize);
  const totalPrice = quantity * unitPrice;

  // PromptPay QR URL generator via promptpay.io
  const promptPayQrUrl = useMemo(() => {
    const cleanAccount = PROMPTPAY_ACCOUNT.replace(/[^0-9]/g, "");
    return `https://promptpay.io/${cleanAccount}/${totalPrice}.png`;
  }, [totalPrice]);

  const handleCopyPromptPay = () => {
    navigator.clipboard.writeText(PROMPTPAY_ACCOUNT);
    setCopiedPromptPay(true);
    toast.success("คัดลอกหมายเลขพร้อมเพย์แล้ว");
    setTimeout(() => setCopiedPromptPay(false), 2000);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(totalPrice.toString());
    setCopiedAmount(true);
    toast.success("คัดลอกยอดเงินแล้ว");
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาเลือกไฟล์รูปภาพสลิปโอนเงินครับ");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("ขนาดไฟล์ภาพต้องไม่เกิน 5 MB ครับ");
      return;
    }

    setSlipFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setSlipImage(reader.result as string);
      toast.success("แนบรูปสลิปเรียบร้อยแล้ว");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Date.now() > SHIRT_ORDER_DEADLINE_MS) {
      toast.error(`แบบฟอร์มปิดรับสั่งเสื้อแล้ว (หมดเขต ${SHIRT_ORDER_DEADLINE_TEXT})`);
      setIsExpired(true);
      return;
    }
    if (!selectedStudent) {
      toast.error("กรุณาเลือกนักเรียนก่อนครับ");
      return;
    }
    if (!selectedSize) {
      toast.error("กรุณาเลือกไซส์เสื้อครับ");
      return;
    }
    if (selectedSize === "Other" && !customSize.trim()) {
      toast.error("กรุณาระบุขนาดรอบอกไซส์พิเศษครับ");
      return;
    }

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
    setIsSuccess(true);
    toast.success("บันทึกการสั่งเสื้อเรียบร้อยแล้ว!");
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
    setIsSuccess(false);
    setHasExistingOrder(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 via-slate-50 to-rose-50/30 text-slate-800 antialiased font-sans pb-20">
      <Toaster position="top-center" />

      {/* Standalone Parent Portal Header with #a31e1e tone */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-rose-100 shadow-2xs px-4 py-3 sm:px-6">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#a31e1e] to-rose-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-[#a31e1e]">
                  ห้องเรียน ม.2/3
                </span>
                <span className="text-[11px] text-slate-500 font-medium">โรงเรียนอัสสัมชัญธนบุรี</span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                แบบฟอร์มสั่งเสื้อกิจกรรมห้อง (ผู้ปกครอง)
              </h1>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-[#a31e1e] bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
            <ShieldCheck className="w-3.5 h-3.5 text-[#a31e1e]" />
            <span>ระบบสั่งเสื้อทางการ</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6">
        {isExpired ? (
          /* Expired Banner */
          <div className="bg-white rounded-3xl border border-rose-200 p-8 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-[#a31e1e] flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                ปิดรับแบบฟอร์มสั่งเสื้อแล้ว
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                แบบฟอร์มหมดเขตเมื่อ {SHIRT_ORDER_DEADLINE_TEXT}
              </p>
            </div>
            <p className="text-xs text-slate-600 bg-rose-50/50 rounded-2xl p-4 border border-rose-100 leading-relaxed max-w-md mx-auto">
              หากต้องการสั่งซื้อเพิ่มเติมหรือสอบถามรายละเอียด กรุณาติดต่อคุณครูประจำชั้น ม.2/3 โดยตรงครับ
            </p>
          </div>
        ) : !isSuccess ? (
          <form onSubmit={handleSubmitOrder} className="space-y-5">
            {/* Intro Hero Card with #a31e1e Gradient */}
            <div className="bg-gradient-to-r from-[#a31e1e] to-[#7f1515] text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 text-rose-200 text-xs font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>แบบฟอร์มสำหรับผู้ปกครอง & นักเรียน ม.2/3</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black">
                  สั่งตัดเสื้อกิจกรรมประจำห้อง
                </h2>
                <p className="text-rose-100 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  ผู้ปกครองสามารถค้นหาชื่อหรือเลขประจำตัวนักเรียน เลือกขนาดไซส์เสื้อ และสแกน QR Code พร้อมเพย์เพื่อชำระเงินได้ทันทีครับ
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white border border-white/20">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>เริ่มต้นตัวละ 200 บาท (XS - 2XL)</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full text-xs font-medium text-rose-200 border border-white/10">
                    <span>เกิน 2XL คิดเพิ่มไซส์ละ 20.-</span>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-rose-200/90 pt-2 border-t border-white/15 flex items-center justify-between">
                  <span>⏰ กำหนดหมดเขตสั่งเสื้อ:</span>
                  <span className="font-bold text-white">{SHIRT_ORDER_DEADLINE_TEXT}</span>
                </div>
              </div>
            </div>

            {/* STEP 1: ค้นหาหรือเลือกนักเรียน */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#a31e1e] text-white text-xs font-black flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    ค้นหาและเลือกชื่อนักเรียน
                  </h3>
                </div>
                {selectedStudent && (
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="text-xs text-[#a31e1e] hover:underline font-bold cursor-pointer"
                  >
                    เปลี่ยนคน
                  </button>
                )}
              </div>

              {!selectedStudent ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    พิมพ์ <strong>เลขประจำตัว</strong> (เช่น 30260), <strong>เลขที่</strong>, หรือ <strong>ชื่อเล่น/ชื่อ-นามสกุล</strong>:
                  </p>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="พิมพ์เลขประจำตัว เช่น 30260 หรือ บุ้งกี๋..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a31e1e] focus:bg-white transition-all font-medium"
                      autoFocus
                    />
                  </div>

                  {/* Matching results */}
                  {filteredStudents.length > 0 && (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                      {filteredStudents.map((s) => (
                        <button
                          key={s.student_id}
                          type="button"
                          onClick={() => handleSelectStudent(s)}
                          className="w-full p-3 text-left flex items-center justify-between hover:bg-rose-50/70 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center group-hover:bg-[#a31e1e] group-hover:text-white transition-colors">
                              #{s.student_no}
                            </span>
                            <div>
                              <div className="text-sm font-bold text-slate-900 group-hover:text-[#a31e1e]">
                                {s.prefix}{s.first_name} {s.last_name}
                                {s.nickname && (
                                  <span className="text-slate-500 font-medium ml-1">({s.nickname})</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                เลขประจำตัว: {s.student_id} • ห้อง ม.2/3
                              </div>
                            </div>
                          </div>
                          <div className="text-xs font-bold text-[#a31e1e] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            <span>เลือก</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchQuery.trim() && filteredStudents.length === 0 && (
                    <div className="text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                      ไม่พบข้อมูลนักเรียนตามคำค้นหา กรุณาตรวจสอบเลขประจำตัวหรือชื่ออีกครั้ง
                    </div>
                  )}
                </div>
              ) : (
                /* Selected Student Card */
                <div className="space-y-2">
                  <div className="bg-gradient-to-r from-rose-50 to-orange-50/50 border-2 border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#a31e1e] text-white flex flex-col items-center justify-center shadow-xs shrink-0">
                        <span className="text-[10px] text-rose-200 leading-tight">เลขที่</span>
                        <span className="text-base font-black leading-tight">#{selectedStudent.student_no}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm sm:text-base font-black text-slate-900">
                            {selectedStudent.prefix}{selectedStudent.first_name} {selectedStudent.last_name}
                          </span>
                          {selectedStudent.nickname && (
                            <span className="bg-rose-100 text-[#a31e1e] text-xs font-bold px-2 py-0.5 rounded-full">
                              น้อง{selectedStudent.nickname}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5 font-medium">
                          เลขประจำตัว: <span className="font-mono font-bold text-slate-800">{selectedStudent.student_id}</span> • ม.2/3
                        </div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-[#a31e1e] shrink-0" />
                  </div>

                  {hasExistingOrder && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-xs text-rose-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#a31e1e] shrink-0" />
                      <span>พบข้อมูลสั่งเสื้อเดิมของนักเรียนคนนี้ สามารถแก้ไขและกดยืนยันใหม่ได้ครับ</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STEP 2: เลือกไซส์เสื้อและจำนวน */}
            <div className={`bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4 ${!selectedStudent ? "opacity-40 pointer-events-none" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#a31e1e] text-white text-xs font-black flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    เลือกขนาดไซส์เสื้อ & จำนวนตัว
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSizeGuide(!showSizeGuide)}
                  className="text-xs font-bold text-[#a31e1e] flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>ตารางขนาด</span>
                  {showSizeGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Complete Size Guide Table as per user image */}
              <AnimatePresence>
                {showSizeGuide && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-3 text-xs overflow-x-auto">
                      <div className="font-bold text-[#a31e1e] mb-2 text-center text-xs">
                        ตารางวัดขนาดไซส์เสื้อห้อง ม.2/3 (หน่วยเป็นนิ้ว):
                      </div>
                      <table className="w-full text-center border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-white border-b border-rose-200 font-bold text-slate-800">
                            <th className="py-1.5 px-2">SIZE</th>
                            {SHIRT_SIZES_GUIDE.map((g) => (
                              <th key={g.size} className="py-1.5 px-1.5">{g.size}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-100">
                          <tr>
                            <td className="py-1.5 px-2 font-bold text-slate-700 bg-white">CHEST (อก)</td>
                            {SHIRT_SIZES_GUIDE.map((g) => (
                              <td key={g.size} className="py-1.5 px-1.5 font-mono">{g.chest}&quot;</td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-1.5 px-2 font-bold text-slate-700 bg-white">LONG (ยาว)</td>
                            {SHIRT_SIZES_GUIDE.map((g) => (
                              <td key={g.size} className="py-1.5 px-1.5 font-mono">{g.length}&quot;</td>
                            ))}
                          </tr>
                          <tr className="bg-rose-100/70 font-bold text-[#a31e1e]">
                            <td className="py-1.5 px-2">ราคา</td>
                            {SHIRT_SIZES_GUIDE.map((g) => (
                              <td key={g.size} className="py-1.5 px-1.5">{g.price}.-</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sizes Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  เลือกไซส์เสื้อ:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {SHIRT_SIZES_GUIDE.map((item) => {
                    const isSelected = selectedSize === item.size;
                    return (
                      <button
                        key={item.size}
                        type="button"
                        onClick={() => setSelectedSize(item.size)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-[#a31e1e] text-white border-[#a31e1e] shadow-sm scale-[1.02]"
                            : "bg-slate-50 hover:bg-rose-50/50 text-slate-700 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-black">{item.size}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-white text-slate-500 border border-slate-200"
                            }`}
                          >
                            อก {item.chest}&quot;
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px]">
                          <span className={isSelected ? "text-rose-200" : "text-slate-400"}>
                            ยาว {item.length}&quot;
                          </span>
                          <span className={`font-bold ${isSelected ? "text-white" : "text-[#a31e1e]"}`}>
                            {item.price}.-
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {/* Option: Other */}
                  <button
                    type="button"
                    onClick={() => setSelectedSize("Other")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedSize === "Other"
                        ? "bg-[#a31e1e] text-white border-[#a31e1e] shadow-sm scale-[1.02]"
                        : "bg-slate-50 hover:bg-rose-50/50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black">ไซส์พิเศษ</span>
                      <span className={`text-[10px] font-bold ${selectedSize === "Other" ? "text-rose-200" : "text-slate-500"}`}>
                        กำหนดเอง
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className={selectedSize === "Other" ? "text-rose-200" : "text-slate-400"}>
                        ระบุรอบอก
                      </span>
                      <span className={`font-bold ${selectedSize === "Other" ? "text-white" : "text-[#a31e1e]"}`}>
                        260.-
                      </span>
                    </div>
                  </button>
                </div>

                {selectedSize === "Other" && (
                  <div className="mt-2 pt-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      ระบุไซส์พิเศษ หรือรอบอกที่ต้องการ:
                    </label>
                    <input
                      type="text"
                      value={customSize}
                      onChange={(e) => setCustomSize(e.target.value)}
                      placeholder="เช่น อก 54 นิ้ว หรือ 6XL..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#a31e1e] focus:bg-white"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Quantity selector */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">จำนวนเสื้อที่ต้องการ:</span>
                  <span className="text-[11px] text-slate-400">สั่งเพิ่มให้คนในครอบครัวหรือใส่สำรองได้ครับ</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-lg flex items-center justify-center transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-lg font-black text-slate-900 font-mono">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-lg flex items-center justify-center transition-colors cursor-pointer"
                  >
                    +
                  </button>
                  <span className="text-xs text-slate-500 font-bold ml-1">ตัว</span>
                </div>
              </div>

              {/* Summary Price Callout */}
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#a31e1e] block">
                    ยอดรวมที่ต้องชำระ:
                  </span>
                  <span className="text-[11px] text-rose-700">
                    ({quantity} ตัว × {unitPrice} บาท)
                  </span>
                </div>
                <span className="text-xl font-black text-[#a31e1e]">
                  {totalPrice.toLocaleString()} บาท
                </span>
              </div>
            </div>

            {/* STEP 3: ข้อมูลผู้ปกครอง & แนบสลิปชำระเงิน */}
            <div className={`bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4 ${!selectedStudent ? "opacity-40 pointer-events-none" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#a31e1e] text-white text-xs font-black flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  ข้อมูลผู้ปกครอง & แนบสลิปชำระเงิน
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    ชื่อผู้ปกครอง / ผู้ติดต่อ:
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="เช่น คุณแม่สมศรี..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#a31e1e] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    เบอร์โทรศัพท์ติดต่อ:
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="เช่น 081-234-5678"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#a31e1e] focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  หมายเหตุเพิ่มเติม (ถ้ามี):
                </label>
                <input
                  type="text"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="เช่น สั่งไซส์เผื่อโต หรือ ชำระเงินสดกับครูประจำชั้น..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#a31e1e] focus:bg-white"
                />
              </div>

              {/* Optional Slip Upload */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  แนบภาพสลิปโอนเงิน (ถ้ามี):
                </label>
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
                    className="w-full py-3 px-4 border-2 border-dashed border-rose-200 hover:border-[#a31e1e] bg-rose-50/40 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:text-[#a31e1e] transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-[#a31e1e]" />
                    <span>กดเพื่อแนบภาพสลิปโอนเงิน (รูปภาพ JPG / PNG)</span>
                  </button>
                ) : (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={slipImage} alt="สลิปโอนเงิน" className="w-12 h-12 object-cover rounded-xl border border-rose-200 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {slipFileName || "สลิปโอนเงิน"}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold">✓ แนบสลิปเรียบร้อยแล้ว</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSlipImage(null);
                        setSlipFileName("");
                      }}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer shrink-0"
                    >
                      ลบสลิป
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={!selectedStudent || isSubmitting}
                className="w-full py-4 px-6 rounded-2xl bg-[#a31e1e] hover:bg-[#851818] disabled:bg-slate-300 text-white font-black text-sm sm:text-base shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>กำลังบันทึกข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>บันทึกข้อมูล & รับ QR จ่ายเงิน ({totalPrice.toLocaleString()} บาท)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* ========================================================================= */
          /* SUCCESS & PROMPTPAY PAYMENT VIEW                                          */
          /* ========================================================================= */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-5"
          >
            {/* Success Banner */}
            <div className="bg-gradient-to-r from-[#a31e1e] to-rose-700 text-white rounded-3xl p-6 text-center shadow-lg relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-white text-[#a31e1e] flex items-center justify-center mx-auto mb-3 shadow-md">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                บันทึกการสั่งเสื้อเรียบร้อยแล้ว!
              </h2>
              <p className="text-rose-100 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                สำหรับ {selectedStudent?.prefix}{selectedStudent?.first_name} {selectedStudent?.last_name} (เลขที่ #{selectedStudent?.student_no}) ไซส์ {selectedSize === "Other" ? customSize : selectedSize} จำนวน {quantity} ตัว
              </p>
            </div>

            {/* PromptPay Payment Card */}
            <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-7 shadow-sm text-center space-y-5">
              <div className="flex items-center justify-center gap-2 text-slate-800">
                <QrCode className="w-6 h-6 text-[#a31e1e]" />
                <h3 className="text-base sm:text-lg font-black">
                  สแกนจ่ายเงินผ่าน QR PromptPay
                </h3>
              </div>

              {/* QR Code from promptpay.io */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 inline-block mx-auto shadow-inner">
                <img
                  src={promptPayQrUrl}
                  alt={`QR PromptPay ${totalPrice} บาท`}
                  className="w-52 h-52 sm:w-60 sm:h-60 mx-auto rounded-xl shadow-xs"
                />
                <div className="mt-3 text-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    ยอดเงินที่ต้องสแกนชำระ
                  </span>
                  <span className="text-2xl font-black text-[#a31e1e]">
                    ฿{totalPrice.toLocaleString()} บาท
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200 max-w-md mx-auto space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">บัญชีผู้รับโอน:</span>
                  <span className="font-bold text-slate-800 text-right">{PROMPTPAY_ACCOUNT_NAME}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">หมายเลขพร้อมเพย์:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900 text-sm">{PROMPTPAY_ACCOUNT}</span>
                    <button
                      type="button"
                      onClick={handleCopyPromptPay}
                      className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                      title="คัดลอกเบอร์"
                    >
                      {copiedPromptPay ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">ยอดชำระ:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#a31e1e] text-sm">{totalPrice} บาท</span>
                    <button
                      type="button"
                      onClick={handleCopyAmount}
                      className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                      title="คัดลอกยอดเงิน"
                    >
                      {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-rose-50 text-rose-900 rounded-2xl p-3 text-xs border border-rose-200 max-w-md mx-auto text-center">
                💡 เมื่อโอนเงินแล้ว ข้อมูลการสั่งและยอดเงินจะถูกบันทึกส่งตรงถึงคุณครูประจำชั้น ม.2/3 โดยอัตโนมัติครับ
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>สั่งเพิ่มสำหรับนักเรียนคนอื่น</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Receipt className="w-4 h-4" />
                  <span>พิมพ์หรือบันทึกใบสั่งซื้อ</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Portal Footer */}
      <footer className="mt-12 text-center text-xs text-slate-400">
        <p>ระบบสั่งเสื้อกิจกรรมห้อง ม.2/3 • โรงเรียนอัสสัมชัญธนบุรี</p>
      </footer>
    </div>
  );
}
