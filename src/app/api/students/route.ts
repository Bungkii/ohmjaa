import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import fallbackStudents from "@/data/students.json";
import type { Student } from "@/types/penalty";

export const dynamic = "force-dynamic";

/**
 * GET /api/students
 * ดึงข้อมูลรายชื่อนักเรียนล่าสุดโดยตรงจากฐานข้อมูล SQL (ตาราง student_accounts)
 * พร้อมผสานข้อมูลล่าสุดจาก src/data/students.json
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("student_accounts")
      .select("student_id, student_no, prefix, first_name, last_name, nickname, full_name")
      .order("student_no", { ascending: true });

    const localList = (fallbackStudents as unknown) as Student[];
    const localMap = new Map(localList.map((s) => [s.student_id, s]));

    if (error || !data || data.length === 0) {
      return NextResponse.json({ ok: true, students: localList });
    }

    const merged = (data as Student[]).map((s) => {
      const local = localMap.get(s.student_id);
      return {
        ...s,
        nickname: local?.nickname ?? s.nickname,
        first_name: local?.first_name ?? s.first_name,
        last_name: local?.last_name ?? s.last_name,
        full_name: local?.full_name ?? s.full_name,
      };
    });

    return NextResponse.json({ ok: true, students: merged });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: true, students: (fallbackStudents as unknown) as Student[], error: msg },
      { status: 200 }
    );
  }
}

