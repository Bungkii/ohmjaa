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
      checkReceiver?: Array<{
        accountType?: string;
        accountNumber?: string;
        accountNameTH?: string;
      }>;
    } = {
      checkDuplicate: true,
      checkReceiver: [
        {
          accountType: "01006", // ธนาคารกรุงไทย
          accountNumber: "1370404514",
          accountNameTH: "ปุณยาพร สิงห์ลอ",
        },
      ],
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

    // แปลงข้อความ error ให้เข้าใจง่ายภาษาไทย
    let userMessage = data.message || "ตรวจสอบสลิปไม่ผ่าน";
    if (data.code === "200000" || data.code === "200200") {
      userMessage = "สลิปถูกต้อง ยอดเงินและบัญชีปลายทางถูกต้อง";
    } else if (data.code === "200401") {
      userMessage = "บัญชีปลายทางไม่ตรงกับบัญชีที่กำหนด (ต้องโอนเข้า ธ.กรุงไทย 1370404514 ปุณยาพร สิงห์ลอ)";
    } else if (data.code === "200402") {
      userMessage = `ยอดเงินที่โอนไม่ตรงกับยอดที่สั่งซื้อ (ต้องโอนอย่างน้อย ${expectedAmount} บาท)`;
    } else if (data.code === "200404") {
      userMessage = "ไม่พบข้อมูลสลิปนี้ในระบบธนาคาร หรือสลิปยังไม่เข้าระบบ";
    } else if (data.code === "200501") {
      userMessage = "สลิปนี้เคยถูกใช้งานในระบบไปแล้ว (สลิปซ้ำ)";
    } else if (data.code === "200500" || data.code === "400001") {
      userMessage = "รูปภาพไม่ชัดเจน หรือไม่พบข้อมูลสลิปธนาคารที่ถูกต้อง";
    }

    return NextResponse.json({
      ok: data.code === "200000" || data.code === "200200",
      code: data.code,
      message: userMessage,
      data: data.data || null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการตรวจสอบสลิป";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
