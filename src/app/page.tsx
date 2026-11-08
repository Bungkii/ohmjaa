import { createClient } from "@/utils/supabase/server";
import DisciplinaryApp from "@/components/DisciplinaryApp";
import fallbackStudents from "@/data/students.json";
import type { Student, PenaltyRecord } from "@/types/penalty";

export const revalidate = 0;

export default async function HomePage() {
  let students: Student[] = (fallbackStudents as unknown) as Student[];
  let records: PenaltyRecord[] = [];
  let weeklyDuty: Record<string, string> = {};

  try {
    const supabase = await createClient();
    const [studentsRes, recordsRes] = await Promise.all([
      supabase
        .from("student_accounts")
        .select("student_id, student_no, prefix, first_name, last_name, nickname, full_name")
        .order("student_no", { ascending: true }),
      supabase
        .from("ohmjaa_penalties")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (studentsRes.data && studentsRes.data.length > 0) {
      students = studentsRes.data as Student[];
    }
    if (recordsRes.data) {
      records = recordsRes.data as PenaltyRecord[];
    }
    const { data: dutyRows } = await supabase.from("student_weekly_duty")
      .select("student_id, weekday");
    weeklyDuty = Object.fromEntries((dutyRows ?? []).map((row) => [row.student_id, row.weekday]));
  } catch (err) {
    console.warn("Could not fetch from Supabase on server, using fallback:", err);
  }

  return (
    <DisciplinaryApp
      initialStudents={students}
      initialRecords={records}
      initialWeeklyDuty={weeklyDuty}
      initialAudit={[]}
      teacherEmail="ครูประจำชั้น ม.2/3"
    />
  );
}
