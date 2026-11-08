"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  ExternalLink,
  ChevronLeft,
  Copy,
  Check,
  CreditCard,
  Building,
  HelpCircle,
  ShoppingBag,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import fallbackStudents from "@/data/students.json";
import { Student } from "@/types/penalty";
import { ShirtSize, StudentShirtInfo } from "@/types/activities";

// Standard Classroom Shirt Size Options with Chest measurements (inches)
const SHIRT_SIZES_GUIDE = [
  { size: "S", chest: "36", length: "26", desc: "รอบอก 36 นิ้ว / ยาว 26 นิ้ว" },
  { size: "M", chest: "38", length: "27", desc: "รอบอก 38 นิ้ว / ยาว 27 นิ้ว" },
  { size: "L", chest: "40", length: "28", desc: "รอบอก 40 นิ้ว / ยาว 28 นิ้ว" },
  { size: "XL", chest: "42", length: "29", desc: "รอบอก 42 นิ้ว / ยาว 29 นิ้ว" },
  { size: "2XL", chest: "44", length: "30", desc: "รอบอก 44 นิ้ว / ยาว 30 นิ้ว" },
  { size: "3XL", chest: "48", length: "31", desc: "รอบอก 48 นิ้ว / ยาว 31 นิ้ว" },
  { size: "4XL", chest: "52", length: "32", desc: "รอบอก 52 นิ้ว / ยาว 32 นิ้ว" },
];

const DEFAULT_SHIRT_PRICE = 250; // ราคาตัวละ 250 บาท (ปรับเปลี่ยนได้)
const PROMPTPAY_ACCOUNT = "0987654321"; // บัญชีพร้อมเพย์ครูประจำชั้น / กองกลางห้อง ม.2/3
const PROMPTPAY_ACCOUNT_NAME = "บัญชีกองกลางห้อง ม.2/3 (คุณครูประจำชั้น)";

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

  // Submission & Payment State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedPromptPay, setCopiedPromptPay] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

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
  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery("");

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
        }
      }
    } catch {}
  };

  const totalPrice = quantity * DEFAULT_SHIRT_PRICE;

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

  // Submit order form
  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error("กรุณาเลือกนักเรียนก่อนครับ");
      return;
    }
    if (!selectedSize) {
      toast.error("กรุณาเลือกไซส์เสื้อครับ");
      return;
    }
    if (selectedSize === "Other" && !customSize.trim()) {
      toast.error("กรุณาระบุขนาดไซส์พิเศษครับ");
      return;
    }

    setIsSubmitting(true);

    try {
      const saved = localStorage.getItem("ohmjaa_shirt_sizes_v1");
      const records: Record<string, StudentShirtInfo> = saved ? JSON.parse(saved) : {};

      const newInfo: StudentShirtInfo = {
        student_id: selectedStudent.student_id,
        size: selectedSize,
        quantity: quantity || 1,
        custom_size: selectedSize === "Other" ? customSize.trim() : undefined,
        parent_name: parentName.trim() || undefined,
        parent_phone: parentPhone.trim() || undefined,
        note: orderNote.trim() || undefined,
        ordered_at: new Date().toISOString(),
      };

      records[selectedStudent.student_id] = newInfo;
      localStorage.setItem("ohmjaa_shirt_sizes_v1", JSON.stringify(records));

      setIsSuccess(true);
      toast.success("บันทึกข้อมูลการสั่งเสื้อเรียบร้อยแล้ว!");
    } catch {
      toast.error("ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSelectedStudent(null);
    setSelectedSize("M");
    setQuantity(1);
    setCustomSize("");
    setParentName("");
    setParentPhone("");
    setOrderNote("");
    setIsSuccess(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-800 antialiased font-sans pb-16">
      <Toaster position="top-center" />

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs px-4 py-3 sm:px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#16453d] to-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  ห้อง ม.2/3
                </span>
                <span className="text-xs text-slate-400">• สั่งเสื้อกิจกรรม</span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                แบบฟอร์มสั่งเสื้อห้อง ม.2/3
              </h1>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#16453d] px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>หน้าหลัก</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7">
        {!isSuccess ? (
          <form onSubmit={handleSubmitOrder} className="space-y-6">
            {/* Intro Hero Card */}
            <div className="bg-gradient-to-r from-[#16453d] to-[#0e302a] text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>สำหรับผู้ปกครองและนักเรียน ม.2/3</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black">
                  สั่งตัดเสื้อห้อง & กิจกรรมพิเศษ
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
                  กรุณากรอกรหัสนักเรียนหรือค้นหาชื่อเพื่อเลือกไซส์เสื้อ และสแกนชำระเงินผ่านพร้อมเพย์ (QR PromptPay) ได้ทันทีครับ
                </p>
                <div className="mt-3.5 inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-200 border border-white/15">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>ราคาเสื้อตัวละ {DEFAULT_SHIRT_PRICE} บาท</span>
                </div>
              </div>
            </div>

            {/* STEP 1: ค้นหาหรือเลือกนักเรียน */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#16453d] text-white text-xs font-black flex items-center justify-center">
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
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer"
                  >
                    เปลี่ยนคน
                  </button>
                )}
              </div>

              {!selectedStudent ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    พิมพ์ <strong>เลขประจำตัว</strong>, <strong>เลขที่</strong>, หรือ <strong>ชื่อ-นามสกุล / ชื่อเล่น</strong> ของนักเรียน:
                  </p>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="เช่น 30260 หรือ บุ้งกี๋ หรือ ปัณณพัฒน์..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16453d] focus:bg-white transition-all"
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
                          className="w-full p-3 text-left flex items-center justify-between hover:bg-emerald-50/70 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center group-hover:bg-[#16453d] group-hover:text-white transition-colors">
                              #{s.student_no}
                            </span>
                            <div>
                              <div className="text-sm font-bold text-slate-900 group-hover:text-[#16453d]">
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
                          <div className="text-xs font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
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
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#16453d] text-white flex flex-col items-center justify-center shadow-xs">
                      <span className="text-[10px] text-emerald-300 leading-tight">เลขที่</span>
                      <span className="text-base font-black leading-tight">#{selectedStudent.student_no}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-black text-slate-900">
                          {selectedStudent.prefix}{selectedStudent.first_name} {selectedStudent.last_name}
                        </span>
                        {selectedStudent.nickname && (
                          <span className="bg-emerald-200/80 text-emerald-900 text-xs font-bold px-2 py-0.5 rounded-full">
                            น้อง{selectedStudent.nickname}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5 font-medium">
                        เลขประจำตัว: <span className="font-mono font-bold text-slate-800">{selectedStudent.student_id}</span> • ชั้นมัธยมศึกษาปีที่ 2/3
                      </div>
                    </div>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                </div>
              )}
            </div>

            {/* STEP 2: เลือกไซส์เสื้อและจำนวน */}
            <div className={`bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4 ${!selectedStudent ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#16453d] text-white text-xs font-black flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  เลือกขนาดไซส์เสื้อ & จำนวนตัว
                </h3>
              </div>

              {/* Sizes Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  ตารางขนาดไซส์เสื้อ (นิ้ว):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SHIRT_SIZES_GUIDE.map((item) => {
                    const isSelected = selectedSize === item.size;
                    return (
                      <button
                        key={item.size}
                        type="button"
                        onClick={() => setSelectedSize(item.size as ShirtSize)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-[#16453d] text-white border-[#16453d] shadow-sm scale-[1.02]"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-black">{item.size}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              isSelected
                                ? "bg-white/20 text-emerald-200"
                                : "bg-white text-slate-500 border border-slate-200"
                            }`}
                          >
                            อก {item.chest}&quot;
                          </span>
                        </div>
                        <span className={`text-[11px] mt-1 line-clamp-1 ${isSelected ? "text-slate-200" : "text-slate-500"}`}>
                          ยาว {item.length}&quot;
                        </span>
                      </button>
                    );
                  })}

                  {/* Option: Other */}
                  <button
                    type="button"
                    onClick={() => setSelectedSize("Other")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedSize === "Other"
                        ? "bg-[#16453d] text-white border-[#16453d] shadow-sm scale-[1.02]"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black">ไซส์พิเศษ</span>
                      <span className={`text-[10px] font-bold ${selectedSize === "Other" ? "text-emerald-200" : "text-slate-500"}`}>
                        กำหนดเอง
                      </span>
                    </div>
                    <span className={`text-[11px] mt-1 ${selectedSize === "Other" ? "text-slate-200" : "text-slate-500"}`}>
                      ระบุขนาดรอบอก
                    </span>
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
                      placeholder="เช่น อก 56 นิ้ว, 5XL..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#16453d] focus:bg-white"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Quantity selector */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">จำนวนเสื้อที่ต้องการ:</span>
                  <span className="text-[11px] text-slate-400">สั่งเพิ่มให้คนในครอบครัวได้ครับ</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-base flex items-center justify-center transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-base font-black text-slate-900 font-mono">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-base flex items-center justify-center transition-colors cursor-pointer"
                  >
                    +
                  </button>
                  <span className="text-xs text-slate-500 font-bold ml-1">ตัว</span>
                </div>
              </div>

              {/* Summary Price Callout */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">
                  ยอดรวมที่ต้องชำระ ({quantity} ตัว × {DEFAULT_SHIRT_PRICE} บาท):
                </span>
                <span className="text-base sm:text-lg font-black text-amber-900">
                  {totalPrice.toLocaleString()} บาท
                </span>
              </div>
            </div>

            {/* STEP 3: ข้อมูลติดต่อผู้ปกครอง (ไม่บังคับ) */}
            <div className={`bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-3.5 ${!selectedStudent ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#16453d] text-white text-xs font-black flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  ข้อมูลผู้สั่ง / ผู้ปกครอง
                </h3>
                <span className="text-[11px] text-slate-400 font-normal">(กรอกเพื่อติดต่อกรณีฉุกเฉิน)</span>
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
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#16453d] focus:bg-white"
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
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#16453d] focus:bg-white"
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
                  placeholder="เช่น สั่งไซส์ใหญ่เผื่อโต หรือ โอนเงินแล้วแจ้งทางไลน์..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#16453d] focus:bg-white"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!selectedStudent || isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#16453d] hover:bg-[#0e302a] disabled:bg-slate-300 text-white font-black text-sm sm:text-base shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>กำลังบันทึกข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>ยืนยันข้อมูล & ไปขั้นตอนชำระเงิน</span>
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
            className="space-y-6"
          >
            {/* Success Banner */}
            <div className="bg-emerald-600 text-white rounded-3xl p-6 text-center shadow-lg relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-white text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-md">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                บันทึกการสั่งเสื้อเรียบร้อยแล้ว!
              </h2>
              <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                สำหรับ {selectedStudent?.prefix}{selectedStudent?.first_name} {selectedStudent?.last_name} (เลขที่ #{selectedStudent?.student_no}) ไซส์ {selectedSize === "Other" ? customSize : selectedSize} จำนวน {quantity} ตัว
              </p>
            </div>

            {/* PromptPay Payment Card */}
            <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-7 shadow-sm text-center space-y-5">
              <div className="flex items-center justify-center gap-2 text-slate-800">
                <QrCode className="w-6 h-6 text-[#16453d]" />
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
                    ยอดเงินที่ต้องสแกนจ่าย
                  </span>
                  <span className="text-2xl font-black text-emerald-800">
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
                    <span className="font-bold text-emerald-800 text-sm">{totalPrice} บาท</span>
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

              <div className="bg-amber-50 text-amber-800 rounded-2xl p-3 text-xs border border-amber-200 max-w-md mx-auto text-center">
                💡 เมื่อโอนเงินแล้ว คุณครูประจำชั้นจะได้รับข้อมูลและตรวจสอบยอดให้ในระบบทันทีครับ
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

                <Link
                  href="/"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#16453d] hover:bg-[#0e302a] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>กลับหน้าระบบหลัก</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
