"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function TeacherLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f5f3ef] flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#e5e2db] bg-white p-7 shadow-sm">
        <div className="w-11 h-11 rounded-xl bg-[#16453d] text-white flex items-center justify-center font-bold mb-6">อ</div>
        <h1 className="text-2xl font-bold text-[#182422]">เข้าสู่ระบบครู</h1>
        <p className="text-sm text-[#67736d] mt-1">โอมจ๋า · ห้องเรียน ม.2/3</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block text-sm font-medium text-[#35453d]">อีเมล
            <input type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#d9ddd5] px-3 py-2.5 outline-none focus:border-[#16453d]" />
          </label>
          <label className="block text-sm font-medium text-[#35453d]">รหัสผ่าน
            <input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#d9ddd5] px-3 py-2.5 outline-none focus:border-[#16453d]" />
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-[#16453d] py-2.5 text-white font-semibold hover:bg-[#0f352e] disabled:opacity-50 cursor-pointer">{busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
        </form>
        <p className="text-xs text-[#7a857d] mt-5">ติดต่อผู้ดูแลระบบเพื่อขอบัญชีครูและสิทธิ์เข้าถึงนักเรียน</p>
      </div>
    </main>
  );
}
