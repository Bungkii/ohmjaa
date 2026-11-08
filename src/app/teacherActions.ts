"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { PenaltyRecord, Student, SeverityLevel } from "@/types/penalty";

const penaltyRules: Record<SeverityLevel, { title: string; punishment: string }> = {
  low: { title: "รุนแรงน้อย", punishment: "ทำเวร +1 วัน" },
  medium: { title: "รุนแรงกลาง", punishment: "ทำเวร +1 สัปดาห์" },
  high: { title: "รุนแรงมาก", punishment: "ทำเวร +1 เดือน / 1 เทอม" },
  strict: { title: "ปกครอง", punishment: "ให้ใบปกครอง & เชิญผู้ปกครอง" },
};

async function teacherContext() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("กรุณาเข้าสู่ระบบครู");
  const { data, error } = await supabase.from("teacher_student_access").select("student_id").eq("teacher_id", user.id);
  if (error) throw new Error("ไม่สามารถตรวจสอบสิทธิ์ครูได้");
  return { supabase, user, allowedIds: new Set((data ?? []).map((row) => row.student_id as string)) };
}

async function requireStudent(studentId: string) {
  const context = await teacherContext();
  if (!context.allowedIds.has(studentId)) throw new Error("ไม่มีสิทธิ์ดูหรือแก้ไขข้อมูลนักเรียนคนนี้");
  return context;
}

export async function getTeacherDashboard() {
  const { supabase, allowedIds } = await teacherContext();
  const ids = [...allowedIds];
  if (!ids.length) throw new Error("บัญชีนี้ยังไม่ได้รับสิทธิ์เข้าถึงนักเรียน กรุณาติดต่อผู้ดูแลระบบ");
  const [studentsResult, recordsResult, auditResult] = await Promise.all([
    supabase.from("student_accounts").select("student_id, student_no, prefix, first_name, last_name, nickname, full_name").in("student_id", ids).order("student_no"),
    supabase.from("ohmjaa_penalties").select("*").in("student_id", ids).order("created_at", { ascending: false }),
    supabase.from("teacher_audit_log").select("id, teacher_id, actor_email, action, entity, entity_id, student_id, created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  for (const result of [studentsResult, recordsResult, auditResult]) {
    if (result.error) throw new Error(`โหลดข้อมูลครูไม่สำเร็จ: ${result.error.message}`);
  }
  return {
    students: (studentsResult.data ?? []) as Student[],
    records: (recordsResult.data ?? []) as PenaltyRecord[],
    audit: (auditResult.data ?? []) as TeacherAuditEntry[],
  };
}

export interface TeacherAuditEntry {
  id: number;
  teacher_id: string;
  actor_email: string;
  action: string;
  entity: string;
  entity_id: string;
  student_id: string;
  created_at: string;
}

export async function getTeacherAudit() {
  const { supabase } = await teacherContext();
  const { data, error } = await supabase.from("teacher_audit_log")
    .select("id, teacher_id, actor_email, action, entity, entity_id, student_id, created_at")
    .order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as TeacherAuditEntry[];
}

export async function createPenaltyRecord(input: { student_id: string; incident: string; severity: SeverityLevel; status: PenaltyRecord["status"]; follow_up_note: string }) {
  const { supabase, user } = await requireStudent(input.student_id);
  if (!input.incident.trim()) throw new Error("กรุณาระบุเหตุการณ์");
  const rule = penaltyRules[input.severity];
  if (!rule) throw new Error("ระดับความรุนแรงไม่ถูกต้อง");
  if (!["pending", "completed", "forgiven"].includes(input.status)) throw new Error("สถานะไม่ถูกต้อง");
  const { data: student, error: studentError } = await supabase.from("student_accounts")
    .select("student_no, prefix, first_name, last_name, nickname").eq("student_id", input.student_id).single();
  if (studentError || !student) throw new Error("ไม่พบนักเรียน");
  const { data, error } = await supabase.from("ohmjaa_penalties").insert({
    id: crypto.randomUUID(),
    student_id: input.student_id,
    student_no: student.student_no,
    student_name: `${student.prefix}${student.first_name} ${student.last_name}`,
    student_nickname: student.nickname,
    severity: input.severity,
    severity_title: rule.title,
    punishment: rule.punishment,
    incident: input.incident.trim(),
    status: input.status,
    follow_up_note: input.follow_up_note.trim(),
    updated_by: user.id,
  }).select("*").single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data as PenaltyRecord;
}

export async function updatePenaltyRecord(id: string, changes: {
  incident: string;
  severity: SeverityLevel;
  status: PenaltyRecord["status"];
  follow_up_note: string;
}) {
  const { supabase } = await teacherContext();
  const { data: current, error: readError } = await supabase.from("ohmjaa_penalties").select("student_id").eq("id", id).single();
  if (readError || !current) throw new Error("ไม่พบบันทึกหรือไม่มีสิทธิ์แก้ไข");
  const { user } = await requireStudent(current.student_id);
  if (!changes.incident.trim()) throw new Error("กรุณาระบุเหตุการณ์");
  if (!["pending", "completed", "forgiven"].includes(changes.status)) throw new Error("สถานะไม่ถูกต้อง");
  const rule = penaltyRules[changes.severity];
  if (!rule) throw new Error("ระดับความรุนแรงไม่ถูกต้อง");
  const { data, error } = await supabase.from("ohmjaa_penalties").update({
    ...changes, severity_title: rule.title, punishment: rule.punishment,
    incident: changes.incident.trim(), follow_up_note: changes.follow_up_note.trim(),
    updated_at: new Date().toISOString(), updated_by: user.id,
  }).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data as PenaltyRecord;
}

export async function deletePenaltyRecord(id: string) {
  const { supabase } = await teacherContext();
  const { data: current, error: readError } = await supabase.from("ohmjaa_penalties").select("student_id").eq("id", id).single();
  if (readError || !current) throw new Error("ไม่พบบันทึกหรือไม่มีสิทธิ์ลบ");
  await requireStudent(current.student_id);
  const { error } = await supabase.from("ohmjaa_penalties").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function signOutTeacher() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
}
