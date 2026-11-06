export interface Student {
  student_id: string;
  student_no: number;
  prefix: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  full_name: string;
}

export type SeverityLevel = 'low' | 'medium' | 'high' | 'strict';

export interface PunishmentRule {
  key: SeverityLevel;
  title: string;
  icon: string;
  punishment: string;
  badgeBg: string;
  badgeBorder: string;
  textClass: string;
  bgLight: string;
  description: string;
}

export interface PenaltyRecord {
  id: string;
  student_id: string;
  student_no: number;
  student_name: string;
  student_nickname?: string;
  severity: SeverityLevel;
  severity_title: string;
  incident: string;
  punishment: string;
  status: 'pending' | 'completed' | 'forgiven';
  follow_up_note?: string;
  updated_at?: string;
  updated_by?: string;
  created_at: string;
}

export interface HomeworkTask {
  id: string;
  subject: string;
  due_date: string;
  details: string;
  teacher_name?: string | null;
  submission_method?: string | null;
  status: 'todo' | 'in_progress' | 'done' | string;
  work_type?: string | null;
  group_size?: number | null;
  max_score?: number | null;
  created_at?: string;
}

export interface TaskCompletion {
  id?: string;
  student_id: string;
  task_id: string;
  status: 'todo' | 'in_progress' | 'done';
}
