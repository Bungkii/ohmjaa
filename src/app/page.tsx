import { redirect } from "next/navigation";
import { getTeacherDashboard, signOutTeacher } from "./teacherActions";
import { createClient } from "@/utils/supabase/server";
import DisciplinaryApp from "@/components/DisciplinaryApp";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: access, error: accessError } = await supabase.from("teacher_student_access").select("student_id").eq("teacher_id", user.id).limit(1);
  if (accessError || !access?.length) return <main className="min-h-screen bg-[#f5f3ef] flex items-center justify-center p-4"><div className="max-w-md rounded-xl bg-white border border-[#e5e2db] p-7"><h1 className="text-xl font-bold">ยังไม่มีสิทธิ์เข้าถึงข้อมูลนักเรียน</h1><p className="mt-2 text-sm text-[#67736d]">ติดต่อผู้ดูแลระบบเพื่อเพิ่มบัญชีครูและรายชื่อนักเรียนที่รับผิดชอบ</p><form action={signOutTeacher} className="mt-5"><button className="text-sm font-semibold text-[#16453d] cursor-pointer">ออกจากระบบ</button></form></div></main>;
  const { students, records, tasks, completions, audit, reviews } = await getTeacherDashboard();

  return (
    <DisciplinaryApp
      initialStudents={students}
      initialRecords={records}
      initialTasks={tasks}
      initialCompletions={completions}
      initialAudit={audit}
      initialReviews={reviews}
      teacherEmail={user.email ?? "ครู"}
    />
  );
}
