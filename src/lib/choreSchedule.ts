import type { PenaltyRecord } from "@/types/penalty";

export interface ChoreSchedule {
  record: PenaltyRecord;
  start: string;
  end: string | null;
  days: number | null;
}

export function bangkokDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(iso));
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function dateAtUtc(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isSchoolDay(date: Date, holidays: Set<string>): boolean {
  const weekday = date.getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidays.has(toDateKey(date));
}

/**
 * คำนวณช่วงวันทำเวร (Start - End) และจำนวนวันเรียนจริง
 * โดยข้ามวันหยุดเสาร์-อาทิตย์ และวันหยุดพิเศษตาม holidays
 */
export function calculateChoreDateRange(
  startDateStr: string,
  choreDaysCount: number,
  holidays: Set<string>
): { start: string; end: string; schoolDays: number } {
  const date = dateAtUtc(startDateStr);
  let days = 0;
  let start: string | null = null;
  let end: string | null = null;
  const targetDays = Math.max(1, choreDaysCount);

  // เลื่อนไปหาวันเรียนแรกที่เริ่มต้นได้จริง
  while (!isSchoolDay(date, holidays)) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  while (days < targetDays) {
    if (isSchoolDay(date, holidays)) {
      days++;
      start ??= toDateKey(date);
      end = toDateKey(date);
    }
    if (days < targetDays) {
      date.setUTCDate(date.getUTCDate() + 1);
    }
  }

  return {
    start: start ?? startDateStr,
    end: end ?? startDateStr,
    schoolDays: days,
  };
}

export function getChoreSchedule(record: PenaltyRecord, holidays: Set<string>): ChoreSchedule | null {
  const match = record.punishment?.match(/ทำเวร\s*\+?\s*(\d+)\s*(วัน|สัปดาห์|อาทิตย์|เดือน)/);
  if (!record.punishment?.includes("ทำเวร")) return null;
  const recordedOn = bangkokDate(record.created_at);
  if (!match) return { record, start: recordedOn, end: null, days: null };

  const amount = Number(match[1]);
  const unit = match[2];
  if (!Number.isInteger(amount) || amount < 1 || amount > 366) {
    return { record, start: recordedOn, end: null, days: null };
  }

  const date = dateAtUtc(recordedOn);
  let days = 0;
  let start: string | null = null;
  let end: string | null = null;
  if (unit === "เดือน") {
    const limit = dateAtUtc(recordedOn);
    limit.setUTCMonth(limit.getUTCMonth() + amount);
    while (date < limit) {
      if (isSchoolDay(date, holidays)) { days++; start ??= toDateKey(date); end = toDateKey(date); }
      date.setUTCDate(date.getUTCDate() + 1);
    }
  } else {
    const targetDays = amount * (unit === "วัน" ? 1 : 5);
    while (days < targetDays) {
      if (isSchoolDay(date, holidays)) { days++; start ??= toDateKey(date); end = toDateKey(date); }
      date.setUTCDate(date.getUTCDate() + 1);
    }
  }
  return { record, start: start ?? recordedOn, end, days };
}

export function parseHolidayDates(input: string): Set<string> {
  return new Set(input.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? []);
}
