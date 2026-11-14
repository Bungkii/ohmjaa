import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';

export const dynamic = 'force-dynamic';

/**
 * GET: Fetch all shirt orders (or filter by student_id)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');

    const supabase = createClient();
    let query = supabase.from('ohmjaa_shirt_orders').select('*');

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;
    if (error) {
      // Table might not exist yet if migration not run, return empty gracefully
      return NextResponse.json({ ok: false, orders: [], error: error.message }, { status: 200 });
    }

    return NextResponse.json({ ok: true, orders: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, orders: [], error: msg }, { status: 500 });
  }
}

// กำหนดเวลาปิดรับแบบฟอร์มสั่งเสื้อ: 20 พ.ย. 2569 เวลา 23:59:59 น. (Asia/Bangkok = UTC+7)
const SHIRT_ORDER_DEADLINE_MS = new Date("2026-11-20T23:59:59+07:00").getTime();

/**
 * POST: Submit or update a student's shirt order from the parent form
 */
export async function POST(request: Request) {
  try {
    if (Date.now() > SHIRT_ORDER_DEADLINE_MS) {
      return NextResponse.json(
        { ok: false, error: "ฟอร์มนี้หมดอายุแล้ว กรุณาติดต่อผู้ดูแลระบบ" },
        { status: 403 }
      );
    }
    const body = await request.json();
    const {
      student_id,
      student_no,
      student_name,
      student_nickname,
      size,
      quantity = 1,
      custom_size,
      unit_price = 250,
      parent_name,
      parent_phone,
      note,
      slip_url,
    } = body;

    if (!student_id || !size) {
      return NextResponse.json(
        { ok: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุรหัสนักเรียนและไซส์เสื้อ)' },
        { status: 400 }
      );
    }

    const total_price = Number(body.total_price) || (quantity * unit_price);
    const now = new Date().toISOString();

    const orderPayload = {
      student_id,
      student_no: Number(student_no) || 0,
      student_name: student_name || '',
      student_nickname: student_nickname || null,
      size,
      quantity: Number(quantity) || 1,
      custom_size: custom_size || null,
      unit_price: Number(unit_price) || 200,
      total_price,
      parent_name: parent_name || null,
      parent_phone: parent_phone || null,
      note: note || null,
      slip_url: slip_url || null,
      status: body.status || (body.paid ? 'paid' : 'pending'),
      updated_at: now,
    };

    const supabase = createClient();

    // Upsert into ohmjaa_shirt_orders
    const { data, error } = await supabase
      .from('ohmjaa_shirt_orders')
      .upsert(orderPayload, { onConflict: 'student_id' })
      .select();

    if (error) {
      console.warn('Supabase upsert order error:', error);
      // Return ok: false but details so client can fallback to local cache
      return NextResponse.json({ ok: false, error: error.message, order: orderPayload }, { status: 200 });
    }

    return NextResponse.json({ ok: true, order: data?.[0] || orderPayload });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/**
 * PATCH: Update order status (e.g. 'paid' or 'pending') by teacher
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { student_id, status } = body;
    if (!student_id) {
      return NextResponse.json({ ok: false, error: 'Missing student_id' }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('ohmjaa_shirt_orders')
      .update({ status: status || 'pending', updated_at: new Date().toISOString() })
      .eq('student_id', student_id)
      .select();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    }
    return NextResponse.json({ ok: true, order: data?.[0] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

