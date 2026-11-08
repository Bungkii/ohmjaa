import React from "react";
import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f7faf8] text-[#151b2e] text-center antialiased">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-5">
        <div>
          <span className="font-mono text-5xl font-black text-slate-800 tracking-tight block">
            404
          </span>
          <h1 className="text-base font-bold text-slate-900 mt-2">
            ไม่พบหน้าที่คุณค้นหา
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            หน้าที่คุณต้องการอาจถูกย้าย ลบ หรือพิมพ์ที่อยู่ URL ไม่ถูกต้อง
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <Link
            href="/"
            className="w-full py-2.5 px-4 rounded-xl bg-[#16453d] hover:bg-[#0f352e] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Home className="w-3.5 h-3.5" />
            <span>กลับสู่หน้าหลัก</span>
          </Link>

          <Link
            href="/shirt-order"
            className="w-full py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>ไปหน้าสั่งเสื้อห้อง (ผู้ปกครอง)</span>
          </Link>
        </div>
      </div>

      <footer className="mt-8 text-xs text-slate-400">
        โอมจ๋า • ห้อง ม.2/3 โรงเรียนอัสสัมชัญธนบุรี
      </footer>
    </div>
  );
}

