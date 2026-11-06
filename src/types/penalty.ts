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
  created_at: string;
}

export const SEVERITY_RULES: Record<SeverityLevel, PunishmentRule> = {
  low: {
    key: 'low',
    title: 'รุนแรงน้อย',
    icon: 'Leaf',
    punishment: 'ตักเตือนด้วยวาจา / ช่วยครูเก็บขยะในห้อง 5 ชิ้น',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeBorder: 'border-emerald-200 hover:border-emerald-400',
    textClass: 'text-emerald-700',
    bgLight: 'bg-emerald-50/50',
    description: 'ความผิดเล็กน้อย เช่น พูดคุยเล็กน้อย, ลืมของ',
  },
  medium: {
    key: 'medium',
    title: 'รุนแรงกลาง',
    icon: 'AlertTriangle',
    punishment: 'ทำความสะอาดห้องเรียนตอนเย็น 1 วัน / กวาดระเบียง',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeBorder: 'border-amber-200 hover:border-amber-400',
    textClass: 'text-amber-700',
    bgLight: 'bg-amber-50/50',
    description: 'ความผิดปานกลาง เช่น มาสาย, ไม่ส่งงาน, เล่นในเวลาเรียน',
  },
  high: {
    key: 'high',
    title: 'รุนแรงมาก',
    icon: 'Flame',
    punishment: 'ล้างห้องน้ำ / คัดกฎระเบียบ 50 จบ + หัก 5 คะแนนจิตพิสัย',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeBorder: 'border-rose-200 hover:border-rose-400',
    textClass: 'text-rose-700',
    bgLight: 'bg-rose-50/50',
    description: 'ความผิดรุนแรง เช่น ทะเลาะวิวาท, โดดเรียน, ส่งงานช้าเรื้อรัง',
  },
  strict: {
    key: 'strict',
    title: 'ส่งห้องปกครอง',
    icon: 'ShieldAlert',
    punishment: 'เชิญผู้ปกครองพบครูประจำชั้น / บันทึกทัณฑ์บนเข้าประวัติ',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    badgeBorder: 'border-purple-200 hover:border-purple-400',
    textClass: 'text-purple-700',
    bgLight: 'bg-purple-50/50',
    description: 'ความผิดร้ายแรง ละเมิดวินัยโรงเรียนขั้นสูงสุด',
  },
};

