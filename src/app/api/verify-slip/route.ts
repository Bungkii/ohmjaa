import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SLIP2GO_BASE_URL = process.env.SLIP2GO_BASE_URL || "https://connect.slip2go.com";
const SLIP2GO_SECRET_KEY = process.env.SLIP2GO_SECRET_KEY || "vNsULFfzwFBMfcDWC7yYkugOuyFKjAWHD8S9vBHlfok=";

/**
 * POST /api/verify-slip
 * ตรวจสอบสลิปโอนเงินผ่าน Slip2Go API
 * รองรับ:
 * - imageUrl: ลิงก์รูปภาพสลิป (เช่น จาก https://storage.cnintercon.tech/)
 * - expectedAmount: ยอดเงินที่คาดหวัง (ตรวจสอบจำนวนเงินตรงกับยอดสั่งซื้อหรือไม่)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageUrl, expectedAmount } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุ URL ของรูปภาพสลิป" },
        { status: 400 }
      );
    }

    // เตรียม payload ตามเอกสาร Slip2Go REST API Section 5.4
    // POST /api/verify-slip/qr-image-link/info
    const payload: {
      imageUrl: string;
      checkCondition?: {
        checkDuplicate?: boolean;
        checkAmount?: { type: "eq" | "gte" | "lte"; amount: string };
      };
    } = {
      imageUrl,
      checkCondition: {
        checkDuplicate: true,
      },
    };

    if (expectedAmount && Number(expectedAmount) > 0) {
      payload.checkCondition!.checkAmount = {
        type: "gte",
        amount: String(Math.floor(Number(expectedAmount))),
      };
    }

    const res = await fetch(`${SLIP2GO_BASE_URL}/api/verify-slip/qr-image-link/info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SLIP2GO_SECRET_KEY}`,
      },
      body: JSON.stringify({ payload }),
    });

    const data = await res.json();

    // รหัสผลลัพธ์ Slip2Go:
    // 200000: Slip found (สลิปถูกต้อง)
    // 200200: Slip is valid
    // 200401: Recipient Account Not Match
    // 200402: Transfer Amount Not Match
    // 200404: Slip not found
    // 200500: Slip is fraud
    // 200501: Slip is Duplicated (สลิปซ้ำ)
    return NextResponse.json({
      ok: data.code === "200000" || data.code === "200200",
      code: data.code,
      message: data.message,
      data: data.data || null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการตรวจสอบสลิป";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

