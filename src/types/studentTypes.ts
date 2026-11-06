export type StudentRole = 'Student' | 'Leader' | 'Finance' | 'Admin' | 'SuperAdmin';

export const SECURITY_QUESTIONS = [
  'คุณชอบสีอะไร',
  'อาหารที่คุณชอบ',
  'สถานที่โปรดของคุณ',
  'บุคคลที่คุณชื่นชอบ',
] as const;

export type SecurityQuestion = typeof SECURITY_QUESTIONS[number];

export interface StudentAccount {
  student_id: string;
  student_no: number;
  prefix: string;
  first_name: string;
  last_name: string;
  nickname: string;
  full_name: string;
  role: StudentRole;
  password: string; // Hashed password (hash$...)
  is_first_login: boolean;
  security_question?: string;
  security_answer?: string; // Hashed answer (ans$...)
  updated_at: string;
}

/**
 * Safe student account representation for client components (never contains passwords or answers)
 */
export interface SafeStudentAccount {
  student_id: string;
  student_no: number;
  prefix: string;
  first_name: string;
  last_name: string;
  nickname: string;
  full_name: string;
  role: StudentRole;
  is_first_login: boolean;
  has_security_question: boolean;
  updated_at: string;
}

export const ROLE_CONFIG: Record<
  StudentRole,
  { label: string; title: string; badgeColor: string; description: string }
> = {
  Student: {
    label: 'Student (นักเรียนปกติ)',
    title: 'นักเรียนปกติ',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'นักเรียนทั่วไปในห้อง ม.2/3',
  },
  Leader: {
    label: 'Leader (หัวหน้าห้อง)',
    title: 'หัวหน้าห้อง',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'หัวหน้าห้อง จัดการการบ้าน เวร และตารางเรียน',
  },
  Finance: {
    label: 'Finance (เหรัญญิก)',
    title: 'เหรัญญิก',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'เหรัญญิกห้อง จัดการระบบกองทุนห้องและการเก็บเงิน',
  },
  Admin: {
    label: 'Admin (ผู้ดูแลระบบ)',
    title: 'ผู้ดูแลระบบ',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    description: 'ผู้ดูแลระบบ จัดการตารางเรียน เวร และระบบทั่วไป',
  },
  SuperAdmin: {
    label: 'SuperAdmin (โคตรพ่อโคตรแม่ผู้ดูแลระบบ)',
    title: 'โคตรพ่อโคตรแม่ผู้ดูแลระบบ',
    badgeColor:
      'bg-gradient-to-r from-purple-100 via-pink-100 to-rose-100 text-purple-900 border-purple-300 font-extrabold shadow-xs',
    description: 'โคตรพ่อโคตรแม่ผู้ดูแลระบบสูงสุด สิทธิ์เต็มทุกระบบ ห้ามใครดูรหัสผ่าน',
  },
};
