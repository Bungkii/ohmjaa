"use server";

import { createClient } from '@/utils/supabase/server';
import { Student, PenaltyRecord } from '@/types/penalty';
import fallbackStudents from '@/data/students.json';

/**
 * In-memory fallback cache for Edge / Cloudflare Workers environment
 * where local filesystem write access is restricted.
 */
let inMemoryPenalties: PenaltyRecord[] = [];

/**
 * Fetch students list - first try Supabase `student_accounts` table,
 * then fall back to the synchronized dataset from kanbann2-3.
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

  // Edge-safe bundled import
  const students = (fallbackStudents as unknown) as Student[];
  return [...students].sort((a, b) => a.student_no - b.student_no);
}

/**
 * Fetch penalty records from Supabase `ohmjaa_penalties` table or fallback to in-memory/cache
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
    console.warn('Supabase penalties query error:', err);
  }

  return inMemoryPenalties;
}

/**
 * Save new penalty record into Supabase (or in-memory cache)
 */
export async function createPenaltyRecord(
  data: Omit<PenaltyRecord, 'id' | 'created_at'>
): Promise<PenaltyRecord> {
  const newRecord: PenaltyRecord = {
    ...data,
    id: `pen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = await createClient();
    await supabase.from('ohmjaa_penalties').insert(newRecord);
  } catch (err) {
    console.warn('Could not insert to Supabase:', err);
  }

  inMemoryPenalties = [newRecord, ...inMemoryPenalties];
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

  inMemoryPenalties = inMemoryPenalties.filter((item) => item.id !== id);
  return true;
}
