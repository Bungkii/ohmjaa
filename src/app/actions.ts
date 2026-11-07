import { createClient } from '@/utils/supabase/client';
import { Student, PenaltyRecord, HomeworkTask, TaskCompletion } from '@/types/penalty';
import fallbackStudents from '@/data/students.json';

const STORAGE_KEY = 'ohmjaa_penalties_cache';

/**
 * Fetch students list - first try Supabase `student_accounts` table,
 * then fall back to the synchronized dataset from kanbann2-3.
 */
export async function getStudentsList(): Promise<Student[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('student_accounts')
      .select('student_id, student_no, prefix, first_name, last_name, nickname, full_name')
      .order('student_no', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as Student[];
    }
  } catch (err) {
    console.warn('Supabase query error, fallback to static students data:', err);
  }

  const students = (fallbackStudents as unknown) as Student[];
  return [...students].sort((a, b) => a.student_no - b.student_no);
}

/**
 * Fetch homework tasks from Kanbann `homework_tasks` table
 */
export async function getHomeworkTasks(): Promise<HomeworkTask[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('homework_tasks')
      .select('*')
      .order('due_date', { ascending: true });

    if (!error && data) {
      return data as HomeworkTask[];
    }
  } catch (err) {
    console.warn('Supabase homework_tasks query error:', err);
  }
  return [];
}

/**
 * Fetch all task completions for progress calculation
 */
export async function getTaskCompletions(): Promise<TaskCompletion[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('student_task_completions')
      .select('student_id, task_id, status');

    if (!error && data) {
      return data as TaskCompletion[];
    }
  } catch (err) {
    console.warn('Supabase student_task_completions query error:', err);
  }
  return [];
}

/**
 * Fetch penalty records from Supabase `ohmjaa_penalties` table or fallback to browser local storage
 */
export async function getPenaltyRecords(): Promise<PenaltyRecord[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('ohmjaa_penalties')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as PenaltyRecord[];
    }
  } catch (err) {
    console.warn('Supabase penalties query error:', err);
  }

  // Fallback to localStorage if available
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
  }

  return [];
}

/**
 * Save single penalty record into Supabase + local cache
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
    const supabase = createClient();
    await supabase.from('ohmjaa_penalties').insert(newRecord);
  } catch (err) {
    console.warn('Could not insert to Supabase:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const existing: PenaltyRecord[] = saved ? JSON.parse(saved) : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([newRecord, ...existing]));
    } catch {}
  }

  return newRecord;
}

/**
 * Save multiple penalty records into Supabase + local cache (Group mode)
 */
export async function createPenaltyRecordsBulk(
  items: Omit<PenaltyRecord, 'id' | 'created_at'>[]
): Promise<PenaltyRecord[]> {
  const newRecords: PenaltyRecord[] = items.map((data, idx) => ({
    ...data,
    id: `pen_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date(Date.now() + idx).toISOString(),
  }));

  try {
    const supabase = createClient();
    await supabase.from('ohmjaa_penalties').insert(newRecords);
  } catch (err) {
    console.warn('Could not bulk insert to Supabase:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const existing: PenaltyRecord[] = saved ? JSON.parse(saved) : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...newRecords, ...existing]));
    } catch {}
  }

  return newRecords;
}

/**
 * Update an existing penalty record
 */
export async function updatePenaltyRecord(
  id: string,
  changes: Partial<PenaltyRecord>
): Promise<PenaltyRecord | null> {
  const payload = {
    ...changes,
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('ohmjaa_penalties')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (!error && data) {
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const list: PenaltyRecord[] = JSON.parse(saved);
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(list.map((r) => (r.id === id ? { ...r, ...data } : r)))
            );
          }
        } catch {}
      }
      return data as PenaltyRecord;
    }
  } catch (err) {
    console.warn('Supabase update error:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const list: PenaltyRecord[] = JSON.parse(saved);
        const updated = list.map((r) => (r.id === id ? { ...r, ...payload } : r));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return (updated.find((r) => r.id === id) as PenaltyRecord) ?? null;
      }
    } catch {}
  }

  return null;
}

/**
 * Delete a penalty record
 */
export async function deletePenaltyRecord(id: string): Promise<boolean> {
  try {
    const supabase = createClient();
    await supabase.from('ohmjaa_penalties').delete().eq('id', id);
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const existing: PenaltyRecord[] = JSON.parse(saved);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter((i) => i.id !== id)));
      }
    } catch {}
  }

  return true;
}

/**
 * Update task completion for a student
 */
export async function updateTaskCompletion(
  studentId: string,
  taskId: string,
  status: 'todo' | 'in_progress' | 'done'
): Promise<TaskCompletion> {
  const completion: TaskCompletion = {
    student_id: studentId,
    task_id: taskId,
    status,
  };

  try {
    const supabase = createClient();
    // Check if exists
    const { data: existing } = await supabase
      .from('student_task_completions')
      .select('student_id')
      .eq('student_id', studentId)
      .eq('task_id', taskId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('student_task_completions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('student_id', studentId)
        .eq('task_id', taskId);
    } else {
      await supabase
        .from('student_task_completions')
        .insert({ student_id: studentId, task_id: taskId, status });
    }
  } catch (err) {
    console.warn('Supabase updateTaskCompletion error:', err);
  }

  return completion;
}

/**
 * Remove task completion for a student (reset to none / no color)
 */
export async function deleteTaskCompletion(
  studentId: string,
  taskId: string
): Promise<boolean> {
  try {
    const supabase = createClient();
    await supabase
      .from('student_task_completions')
      .delete()
      .eq('student_id', studentId)
      .eq('task_id', taskId);
  } catch (err) {
    console.warn('Supabase deleteTaskCompletion error:', err);
  }
  return true;
}
