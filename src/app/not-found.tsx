import React from "react";
import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-between p-6 bg-[#f7faf8] text-[#151b2e] antialiased select-none z-50">
      {/* Top Bar */}
      <header className="w-full flex items-center justify-between text-xs text-slate-400 font-medium pt-2">
        <span>ห้อง ม.2/3 • โรงเรียนอัสสัมชัญธนบุรี</span>
        <span className="font-mono">ERROR 404</span>
      </header>

      {/* Center Hero Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-sm text-center space-y-6 my-auto">
        <div className="space-y-3">
          <span className="font-mono text-7xl sm:text-8xl font-black text-slate-800 tracking-tight block">
            404
          </span>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            ไม่พบหน้าที่คุณค้นหา
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
            หน้าที่คุณต้องการอาจถูกย้าย ลบ หรือพิมพ์ที่อยู่ URL ไม่ถูกต้อง
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="w-full py-3.5 px-6 rounded-2xl bg-[#16453d] hover:bg-[#0f352e] text-white text-sm font-bold transition-all shadow-sm active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>กลับสู่หน้าหลัก</span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center text-xs text-slate-400 pb-2">
        แอปพลิเคชันโอมจ๋า © ห้อง ม.2/3
      </footer>
    </main>
  );
}
