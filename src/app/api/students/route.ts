import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/students
 * ดึงข้อมูลรายชื่อนักเรียนล่าสุดโดยตรงจากฐานข้อมูล SQL (ตาราง student_accounts)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("student_accounts")
      .select("student_id, student_no, prefix, first_name, last_name, nickname, full_name")
      .order("student_no", { ascending: true });

    if (error) {
      console.warn("Error fetching student_accounts from SQL:", error.message);
      return NextResponse.json(
        { ok: false, error: error.message, students: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, students: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: msg, students: [] },
      { status: 500 }
    );
  }
}

