/**
 * studentSession.ts
 *
 * Pure session token utilities — NO Node.js fs, NO next/headers.
 * Safe to import from both Server Components and Client-side bundles.
 *
 * For cookie-setting functions (setStudentSessionCookies, clearStudentSessionCookies,
 * getCurrentStudentSession), import from @/utils/studentAuth instead.
 */

import crypto from 'crypto';
import { StudentRole } from './studentTypes';

const SESSION_SECRET =
  process.env.STUDENT_SESSION_SECRET || 'primja_super_secret_session_key_2026_m23';

export interface StudentSessionPayload {
  student_id: string;
  student_no: number;
  prefix: string;
  first_name: string;
  last_name: string;
  nickname: string;
  full_name: string;
  role: StudentRole;
  is_first_login: boolean;
  logged_in_at: number;
}

function signPayload(data: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
}

/**
 * Serializes and signs a session payload into a compact token string.
 */
export function createSessionToken(payload: StudentSessionPayload): string {
  const jsonStr = JSON.stringify(payload);
  const base64Data = Buffer.from(jsonStr, 'utf-8').toString('base64');
  const signature = signPayload(base64Data);
  return `${base64Data}.${signature}`;
}

/**
 * Verifies and decodes a session token.
 * Returns null if the token is invalid or tampered.
 */
export function verifySessionToken(token: string): StudentSessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [base64Data, signature] = parts;
    const expectedSignature = signPayload(base64Data);
    if (signature !== expectedSignature) return null;

    const jsonStr = Buffer.from(base64Data, 'base64').toString('utf-8');
    return JSON.parse(jsonStr) as StudentSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Reads the student session from any cookie-store-like object.
 * Works inside middleware, supabase/server.ts, and other server contexts.
 * Does NOT call next/headers itself.
 */
export function getStudentSessionFromCookies(
  cookieStore: { get?: (name: string) => { value: string } | undefined }
): StudentSessionPayload | null {
  try {
    const token =
      typeof cookieStore?.get === 'function'
        ? cookieStore.get('primja_session')?.value
        : null;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}
