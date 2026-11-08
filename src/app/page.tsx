import { createClient } from "@/utils/supabase/server";
import DisciplinaryApp from "@/components/DisciplinaryApp";
import fallbackStudents from "@/data/students.json";
import type { Student, PenaltyRecord, HomeworkTask, TaskCompletion } from "@/types/penalty";

export const revalidate = 0;

export default async function HomePage() {
  let students: Student[] = (fallbackStudents as unknown) as Student[];
  let records: PenaltyRecord[] = [];
  let tasks: HomeworkTask[] = [];
  let completions: TaskCompletion[] = [];
  let weeklyDuty: Record<string, string> = {};

  try {
    const supabase = await createClient();
    const [studentsRes, recordsRes, tasksRes, completionsRes] = await Promise.all([
      supabase
        .from("student_accounts")
        .select("student_id, student_no, prefix, first_name, last_name, nickname, full_name")
        .order("student_no", { ascending: true }),
      supabase
        .from("ohmjaa_penalties")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("homework_tasks")
        .select("*")
        .order("due_date", { ascending: true }),
      supabase
        .from("student_task_completions")
        .select("student_id, task_id, status"),
    ]);

    if (studentsRes.data && studentsRes.data.length > 0) {
      students = studentsRes.data as Student[];
    }
    if (recordsRes.data) {
      records = recordsRes.data as PenaltyRecord[];
    }
    if (tasksRes.data) {
      tasks = tasksRes.data as HomeworkTask[];
    }
    if (completionsRes.data) {
      completions = completionsRes.data as TaskCompletion[];
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
      initialTasks={tasks}
      initialCompletions={completions}
      initialWeeklyDuty={weeklyDuty}
      initialAudit={[]}
      initialReviews={[]}
      teacherEmail="ครูประจำชั้น ม.2/3"
    />
  );
}
