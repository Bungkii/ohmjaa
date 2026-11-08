import { Student } from "./penalty";

export type ShirtSize = "S" | "M" | "L" | "XL" | "2XL" | "3XL" | "4XL" | "Other" | "";

export interface StudentShirtInfo {
  student_id: string;
  size: ShirtSize;
  quantity?: number; // จำนวนตัวที่สั่ง (default: 1)
  custom_size?: string;
  paid?: boolean;
  slip_url?: string;
  parent_name?: string;
  parent_phone?: string;
  ordered_at?: string;
  note?: string;
}

export type ActivityRoleType =
  | "athlete"        // นักกีฬา
  | "cheer_stand"    // สแตนด์เชียร์ / กองเชียร์
  | "cheerleader"    // เชียร์ลีดเดอร์
  | "parade_banner"  // ถือป้าย / ขบวนพาเหรด / ถือพาน
  | "welfare"        // สวัสดิการ / ปฐมพยาบาล / น้ำดื่ม
  | "photographer"   // ช่างภาพ / มีเดีย
  | "cleaner"        // ดูแลความสะอาด / ขนของ
  | "custom"         // กำหนดเอง
  | "none";          // ยังไม่ได้ระบุ

export interface ActivityRoleConfig {
  key: ActivityRoleType;
  label: string;
  iconName: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
}

export interface StudentActivityAssignment {
  student_id: string;
  role: ActivityRoleType;
  role_detail?: string; // เช่น ชนิดกีฬา "ฟุตบอล" หรือ "ถือป้ายสีม่วง"
  note?: string;
}

export interface GroupResult {
  id: string;
  name: string;
  color: string;
  leaderId?: string;
  members: Student[];
}

