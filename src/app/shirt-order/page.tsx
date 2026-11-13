"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  Upload,
  ChevronDown,
  ChevronUp,
  Receipt,
  AlertCircle,
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
  { size: "3XL", chest: "46", length: "31", price: 220 }, // เกิน 2XL ขึ้นไป คิดเพิ่มไซส์ละ 20 บาท
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

  const [selectedSize, setSelectedSize] = useState<ShirtSize>("M");
  const [quantity, setQuantity] = useState<number>(1);
  const [customSize, setCustomSize] = useState<string>("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [orderNote, setOrderNote] = useState("");

  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [slipFileName, setSlipFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    ).slice(0, 5);
  }, [students, searchQuery]);

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
      toast.error("กรุณาเลือกไฟล์รูปภาพสลิป");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("ไฟล์ต้องไม่เกิน 5 MB");
      return;
    }

    setSlipFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setSlipImage(reader.result as string);
      toast.success("แนบรูปสลิปแล้ว");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
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
    toast.success("บันทึกการสั่งซื้อเรียบร้อย");
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
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans pb-16">
      <Toaster position="top-center" />

      {/* Clean Navbar matching eae5f15 layout with #a31e1e tone */}
      <nav className="bg-[#a31e1e] text-white px-4 py-3 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">สั่งเสื้อห้อง ม.2/3</span>
            <span className="text-[11px] text-rose-100 font-medium bg-black/15 px-2 py-0.5 rounded">
              เริ่มต้น 200.-
            </span>
          </div>
          <span className="text-xs text-rose-100">โรงเรียนอัสสัมชัญธนบุรี</span>
        </div>
      </nav>

      {/* Main Content Form */}
      <main className="max-w-md mx-auto px-4 pt-5">
        {isExpired ? (
          /* Expired Banner */
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-[#a31e1e] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                ฟอร์มนี้หมดอายุแล้ว
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                กรุณาติดต่อผู้ดูแลระบบ
              </p>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-200 leading-relaxed">
              ฟอร์มนี้หมดอายุแล้ว กรุณาติดต่อผู้ดูแลระบบ (หมดเขต {SHIRT_ORDER_DEADLINE_TEXT})
            </p>
          </div>
        ) : !isSuccess ? (
          <form onSubmit={handleSubmitOrder} className="space-y-4">
            {/* Price Rule Banner with #a31e1e tone */}
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-[#a31e1e] space-y-1">
              <div className="font-bold flex items-center justify-between">
                <span>👕 ราคาเสื้อตัวละ 200 บาท</span>
                <span className="text-[11px] font-normal text-rose-700">ไซส์ XS - 2XL</span>
              </div>
              <div className="text-[11px] text-rose-800">
                * เกินจากไซส์ 2XL ขึ้นไป (3XL, 4XL, 5XL) คิดเพิ่มไซส์ละ 20 บาท
              </div>
              <div className="text-[10px] text-rose-600 pt-0.5 border-t border-rose-200 flex justify-between">
                <span>⏰ หมดเขตสั่งเสื้อ:</span>
                <span className="font-bold">{SHIRT_ORDER_DEADLINE_TEXT}</span>
              </div>
            </div>

            {/* 1. Student Lookup */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900">
                  1. ข้อมูลนักเรียน
                </label>
                {selectedStudent && (
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="text-xs text-[#a31e1e] hover:underline cursor-pointer"
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
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#a31e1e]"
                      autoFocus
                    />
                  </div>

                  {filteredStudents.length > 0 && (
                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden bg-white">
                      {filteredStudents.map((s) => (
                        <button
                          key={s.student_id}
                          type="button"
                          onClick={() => handleSelectStudent(s)}
                          className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-500 w-6">#{s.student_no}</span>
                            <span className="text-xs font-medium text-slate-800">
                              {s.prefix}{s.first_name} {s.last_name}
                              {s.nickname && <span className="text-slate-400 ml-1">({s.nickname})</span>}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">{s.student_id}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchQuery.trim() && filteredStudents.length === 0 && (
                    <div className="text-center py-2 text-slate-400 text-xs">
                      ไม่พบข้อมูลนักเรียน
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      เลขที่ {selectedStudent.student_no} • {selectedStudent.prefix}{selectedStudent.first_name} {selectedStudent.last_name}
                      {selectedStudent.nickname && <span className="text-slate-600 font-normal ml-1">({selectedStudent.nickname})</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      รหัส: {selectedStudent.student_id} • ห้อง ม.2/3
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-[#a31e1e] shrink-0" />
                </div>
              )}
            </div>

            {/* 2. Size & Quantity */}
            <div className={`bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 ${!selectedStudent ? "opacity-40 pointer-events-none" : ""}`}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900">
                  2. เลือกไซส์เสื้อ & จำนวน
                </label>
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(!showSizeGuide)}
                  className="text-xs text-[#a31e1e] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>ตารางขนาด</span>
                  {showSizeGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Exact Table from User Image */}
              {showSizeGuide && (
                <div className="bg-rose-50/50 border border-rose-200 rounded-lg p-2.5 text-[11px] overflow-x-auto">
                  <table className="w-full text-center border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-white border-b border-rose-200 font-bold text-slate-800">
                        <th className="py-1 px-1">SIZE</th>
                        {SHIRT_SIZES_GUIDE.map((g) => (
                          <th key={g.size} className="py-1 px-1">{g.size}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100">
                      <tr>
                        <td className="py-1 px-1 font-bold text-slate-700 bg-white">CHEST (อก)</td>
                        {SHIRT_SIZES_GUIDE.map((g) => (
                          <td key={g.size} className="py-1 px-1 font-mono">{g.chest}&quot;</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-1 px-1 font-bold text-slate-700 bg-white">LONG (ยาว)</td>
                        {SHIRT_SIZES_GUIDE.map((g) => (
                          <td key={g.size} className="py-1 px-1 font-mono">{g.length}&quot;</td>
                        ))}
                      </tr>
                      <tr className="bg-rose-100/60 font-bold text-[#a31e1e]">
                        <td className="py-1 px-1">ราคา</td>
                        {SHIRT_SIZES_GUIDE.map((g) => (
                          <td key={g.size} className="py-1 px-1">{g.price}.-</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Size Buttons Layout */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {SHIRT_SIZES_GUIDE.map((item) => {
                  const isSelected = selectedSize === item.size;
                  return (
                    <button
                      key={item.size}
                      type="button"
                      onClick={() => setSelectedSize(item.size)}
                      className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#a31e1e] text-white border-[#a31e1e] font-bold shadow-xs"
                          : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-medium"
                      }`}
                    >
                      <div className="text-xs">{item.size}</div>
                      <div className={`text-[10px] ${isSelected ? "text-rose-200" : "text-slate-400"}`}>
                        อก {item.chest}&quot;
                      </div>
                      <div className={`text-[10px] font-bold mt-0.5 ${isSelected ? "text-white" : "text-[#a31e1e]"}`}>
                        {item.price}.-
                      </div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setSelectedSize("Other")}
                  className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                    selectedSize === "Other"
                      ? "bg-[#a31e1e] text-white border-[#a31e1e] font-bold shadow-xs"
                      : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-medium"
                  }`}
                >
                  <div className="text-xs">พิเศษ</div>
                  <div className={`text-[10px] ${selectedSize === "Other" ? "text-rose-200" : "text-slate-400"}`}>
                    ระบุเอง
                  </div>
                  <div className={`text-[10px] font-bold mt-0.5 ${selectedSize === "Other" ? "text-white" : "text-[#a31e1e]"}`}>
                    260.-
                  </div>
                </button>
              </div>

              {selectedSize === "Other" && (
                <input
                  type="text"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  placeholder="ระบุขนาดรอบอก เช่น อก 54 นิ้ว..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#a31e1e]"
                  required
                />
              )}

              {/* Quantity */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-600">จำนวนเสื้อ:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-xs font-bold font-mono">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    className="w-8 h-8 rounded border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    +
                  </button>
                  <span className="text-xs text-slate-500 ml-1">ตัว</span>
                </div>
              </div>

              {/* Price Row */}
              <div className="bg-rose-50/70 rounded-lg p-2.5 flex items-center justify-between text-xs border border-rose-100">
                <span className="text-slate-600">ยอดชำระ ({quantity} ตัว × {unitPrice} บาท):</span>
                <span className="font-bold text-[#a31e1e] text-sm">{totalPrice.toLocaleString()} บาท</span>
              </div>
            </div>

            {/* 3. Parent Contact & Slip */}
            <div className={`bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 ${!selectedStudent ? "opacity-40 pointer-events-none" : ""}`}>
              <label className="text-xs font-bold text-slate-900 block">
                3. ข้อมูลติดต่อ & สลิปโอนเงิน (ไม่บังคับ)
              </label>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="ชื่อผู้ปกครอง"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#a31e1e]"
                />
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="เบอร์โทรติดต่อ"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#a31e1e]"
                />
              </div>

              <input
                type="text"
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#a31e1e]"
              />

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
                  className="w-full py-2 border border-dashed border-rose-200 hover:border-[#a31e1e] bg-rose-50/30 rounded-lg text-xs text-slate-600 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#a31e1e]" />
                  <span>แนบสลิปโอนเงิน</span>
                </button>
              ) : (
                <div className="bg-rose-50/50 border border-rose-200 rounded-lg p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs truncate">
                    <img src={slipImage} alt="สลิป" className="w-8 h-8 object-cover rounded border border-rose-200" />
                    <span className="truncate text-slate-700">{slipFileName || "สลิปโอนเงิน"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSlipImage(null);
                      setSlipFileName("");
                    }}
                    className="text-xs text-rose-600 hover:underline cursor-pointer ml-2 shrink-0"
                  >
                    ลบ
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!selectedStudent || isSubmitting}
              className="w-full py-2.5 bg-[#a31e1e] hover:bg-[#881919] disabled:bg-slate-200 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <span>ยืนยันและรับ QR จ่ายเงิน ({totalPrice.toLocaleString()} บาท)</span>
              )}
            </button>
          </form>
        ) : (
          /* Payment QR View */
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-[#a31e1e] flex items-center justify-center mx-auto">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                บันทึกการสั่งเสื้อเรียบร้อย
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedStudent?.prefix}{selectedStudent?.first_name} {selectedStudent?.last_name} (เลขที่ #{selectedStudent?.student_no})
                • ไซส์ {selectedSize === "Other" ? customSize : selectedSize} ({quantity} ตัว)
              </p>
            </div>

            {/* QR Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 inline-block mx-auto">
              <img
                src={promptPayQrUrl}
                alt="QR พร้อมเพย์"
                className="w-48 h-48 mx-auto rounded-lg"
              />
              <div className="mt-2 text-center">
                <span className="text-xs text-slate-500 block">ยอดชำระ</span>
                <span className="text-lg font-bold text-[#a31e1e] font-mono">
                  ฿{totalPrice.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 text-left border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">บัญชี:</span>
                <span className="font-medium text-slate-800">{PROMPTPAY_ACCOUNT_NAME}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">พร้อมเพย์:</span>
                <div className="flex items-center gap-1">
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

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                สั่งเพิ่มอีกคน
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

      <footer className="text-center text-[11px] text-slate-400 mt-8">
        ห้อง ม.2/3 • โรงเรียนอัสสัมชัญธนบุรี
      </footer>
    </div>
  );
}
