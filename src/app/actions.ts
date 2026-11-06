"use server";

import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@/utils/supabase/server';
import { Student, PenaltyRecord } from '@/types/penalty';

const STUDENTS_JSON_PATH = path.join(process.cwd(), 'src', 'data', 'students.json');
const PENALTIES_JSON_PATH = path.join(process.cwd(), 'src', 'data', 'penalties.json');

/**
 * Fetch students list - first try Supabase `student_accounts` table,
 * then fall back to the synchronized `students.json` from kanbann2-3.
 */
export async function getStudentsList(): Promise<Student[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('student_accounts')
      .select('student_id, student_no, prefix, first_name, last_name, nickname, full_name')
      .order('student_no', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as Student[];
    }
  } catch (err) {
    console.warn('Supabase students query error, falling back to local dataset:', err);
  }

  // Fallback to local students.json (same dataset as kanbann2-3)
  try {
    const content = await fs.readFile(STUDENTS_JSON_PATH, 'utf-8');
    const students = JSON.parse(content) as Student[];
    return students.sort((a, b) => a.student_no - b.student_no);
  } catch (e) {
    console.error('Failed to read students fallback json:', e);
    return [];
  }
}

/**
 * Fetch penalty records from Supabase `ohmjaa_penalties` table or fallback to local storage
 */
export async function getPenaltyRecords(): Promise<PenaltyRecord[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ohmjaa_penalties')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as PenaltyRecord[];
    }
  } catch (err) {
    console.warn('Supabase penalties query error, reading local json:', err);
  }

  try {
    const content = await fs.readFile(PENALTIES_JSON_PATH, 'utf-8');
    return JSON.parse(content) as PenaltyRecord[];
  } catch {
    return [];
  }
}

/**
 * Save new penalty record
 */
export async function createPenaltyRecord(data: Omit<PenaltyRecord, 'id' | 'created_at'>): Promise<PenaltyRecord> {
  const newRecord: PenaltyRecord = {
    ...data,
    id: `pen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
  };

  let savedInSupabase = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('ohmjaa_penalties').insert(newRecord);
    if (!error) savedInSupabase = true;
  } catch (err) {
    console.warn('Could not save to Supabase:', err);
  }

  // Always keep local JSON cache synchronized
  try {
    let existing: PenaltyRecord[] = [];
    try {
      const content = await fs.readFile(PENALTIES_JSON_PATH, 'utf-8');
      existing = JSON.parse(content);
    } catch {
      existing = [];
    }

    existing.unshift(newRecord);
    await fs.writeFile(PENALTIES_JSON_PATH, JSON.stringify(existing, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing to local penalties file:', e);
  }

  return newRecord;
}

/**
 * Delete a penalty record
 */
export async function deletePenaltyRecord(id: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    await supabase.from('ohmjaa_penalties').delete().eq('id', id);
  } catch {}

  try {
    const content = await fs.readFile(PENALTIES_JSON_PATH, 'utf-8');
    const existing = JSON.parse(content) as PenaltyRecord[];
    const filtered = existing.filter(item => item.id !== id);
    await fs.writeFile(PENALTIES_JSON_PATH, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}
