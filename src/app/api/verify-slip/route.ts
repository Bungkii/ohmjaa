import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SLIP2GO_BASE_URL = process.env.SLIP2GO_BASE_URL || "https://connect.slip2go.com";
const SLIP2GO_SECRET_KEY = process.env.SLIP2GO_SECRET_KEY || "vNsULFfzwFBMfcDWC7yYkugOuyFKjAWHD8S9vBHlfok=";

/**
 * POST /api/verify-slip
 * ตรวจสอบสลิปโอนเงินผ่าน Slip2Go API
 * รองรับทั้ง:
 * 1. imageBase64: ข้อมูลรูปภาพ Base64 (POST /api/verify-slip/qr-base64/info) - เร็ว เสถียรที่สุด
 * 2. imageUrl: ลิงก์รูปภาพสลิปที่ลงท้ายด้วย .jpg, .jpeg, .png (POST /api/verify-slip/qr-image-link/info)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageUrl, imageBase64, expectedAmount } = body;

    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุรูปภาพสลิป (imageBase64 หรือ imageUrl)" },
        { status: 400 }
      );
    }

    const checkCondition: {
      checkDuplicate?: boolean;
      checkAmount?: { type: "gte"; amount: string };
    } = {
      checkDuplicate: true,
    };

    if (expectedAmount && Number(expectedAmount) > 0) {
      checkCondition.checkAmount = {
        type: "gte",
        amount: String(Math.floor(Number(expectedAmount))),
      };
    }

    let endpoint = `${SLIP2GO_BASE_URL}/api/verify-slip/qr-base64/info`;
    let payload: Record<string, unknown> = {
      imageBase64,
      checkCondition,
    };

    // ถ้าไม่มี base64 แต่มี imageUrl ที่ลงท้ายด้วยไฟล์รูปภาพ
    if (!imageBase64 && imageUrl) {
      const isDirectImage = /\.(jpe?g|png|webp)($|\?)/i.test(imageUrl);
      if (isDirectImage) {
        endpoint = `${SLIP2GO_BASE_URL}/api/verify-slip/qr-image-link/info`;
        payload = {
          imageUrl,
          checkCondition,
        };
      } else {
        // หาก URL ไม่ใช่นามสกุลรูปภาพตรง ให้ fetch แล้วแปลงเป็น base64 ก่อนส่งให้ Slip2Go
        try {
          const fetchRes = await fetch(imageUrl);
          const arrayBuffer = await fetchRes.arrayBuffer();
          const base64Str = Buffer.from(arrayBuffer).toString("base64");
          const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
          payload = {
            imageBase64: `data:${contentType};base64,${base64Str}`,
            checkCondition,
          };
        } catch {
          endpoint = `${SLIP2GO_BASE_URL}/api/verify-slip/qr-image-link/info`;
          payload = { imageUrl, checkCondition };
        }
      }
    }

    const res = await fetch(endpoint, {
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
    // 200500: Slip is fraud (รูปไม่พบ QR ธนาคาร หรือสลิปปลอม)
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
