import { NextResponse } from "next/server";
import sharp from "sharp";
import jsQR from "jsqr";

export const dynamic = "force-dynamic";

const SLIP2GO_BASE_URL = process.env.SLIP2GO_BASE_URL || "https://connect.slip2go.com";
const SLIP2GO_SECRET_KEY = process.env.SLIP2GO_SECRET_KEY || "vNsULFfzwFBMfcDWC7yYkugOuyFKjAWHD8S9vBHlfok=";

/**
 * Server-side QR extraction from image buffer using sharp and jsQR
 */
async function extractQrFromBuffer(buf: Buffer): Promise<string | null> {
  try {
    // 1. Direct raw RGBA
    const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let qr = jsQR(new Uint8ClampedArray(data), info.width, info.height, { inversionAttempts: "attemptBoth" });
    if (qr && qr.data) return qr.data;

    // 2. Resize down if large photo (smartphones typically produce 3000-4000px photos)
    const maxDim = Math.max(info.width, info.height);
    if (maxDim > 1200) {
      const resized = await sharp(buf)
        .resize({ width: 1200, height: 1200, fit: "inside" })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      qr = jsQR(new Uint8ClampedArray(resized.data), resized.info.width, resized.info.height, {
        inversionAttempts: "attemptBoth",
      });
      if (qr && qr.data) return qr.data;
    }

    // 3. Grayscale + normalize contrast
    const enhanced = await sharp(buf)
      .grayscale()
      .normalize()
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    qr = jsQR(new Uint8ClampedArray(enhanced.data), enhanced.info.width, enhanced.info.height, {
      inversionAttempts: "attemptBoth",
    });
    if (qr && qr.data) return qr.data;
  } catch (err) {
    console.warn("QR extraction from buffer error:", err);
  }
  return null;
}

/**
 * POST /api/verify-slip
 * ตรวจสอบสลิปโอนเงินผ่าน Slip2Go API
 * ลำดับการตรวจสอบ:
 * 1. ถ้ามี qrCode (จาก jsQR ฝั่ง client): เรียก /api/verify-slip/qr-code/info ทันที (เร็วและแม่นยำ 100%)
 * 2. ถ้ามี imageBase64: ถอดรหัส QR ด้วย sharp บนเซิร์ฟเวอร์ก่อน ถ้าพบ -> เรียก qr-code/info
 *    ถ้าไม่พบ -> ส่งให้ Slip2Go /api/verify-slip/qr-base64/info
 * 3. ถ้ามี imageUrl ที่เป็นไฟล์ภาพตรง: ส่งให้ Slip2Go /api/verify-slip/qr-image-link/info
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { qrCode, imageUrl, imageBase64, expectedAmount } = body;

    if (!qrCode && !imageUrl && !imageBase64) {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุข้อมูลสลิป (qrCode, imageBase64 หรือ imageUrl)" },
        { status: 400 }
      );
    }

    // สร้างเงื่อนไขตรวจสอบ (checkCondition) ตามสเปกของ Slip2Go API
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
        {
          accountType: "01006",
          accountNameTH: "ปุณยาพร สิงห์ลอ",
        },
        {
          accountNameTH: "ปุณยาพร สิงห์ลอ",
        },
        {
          accountType: "01006",
          accountNumber: "1370404514",
        },
      ],
    };

    if (expectedAmount && Number(expectedAmount) > 0) {
      checkCondition.checkAmount = {
        type: "gte",
        amount: String(Math.floor(Number(expectedAmount))),
      };
    }

    // ถ้ายังไม่มี qrCode แต่มี imageBase64 ให้ลองถอดรหัส QR Code บนเซิร์ฟเวอร์
    if (!qrCode && imageBase64) {
      try {
        const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const imageBuf = Buffer.from(rawBase64, "base64");
        const detectedQr = await extractQrFromBuffer(imageBuf);
        if (detectedQr) {
          qrCode = detectedQr;
        }
      } catch (e) {
        console.warn("Failed to extract QR from base64:", e);
      }
    }

    let endpoint = `${SLIP2GO_BASE_URL}/api/verify-slip/qr-code/info`;
    let payload: Record<string, unknown> = {};

    if (qrCode) {
      endpoint = `${SLIP2GO_BASE_URL}/api/verify-slip/qr-code/info`;
      payload = {
        qrCode,
        checkCondition,
      };
    } else if (imageUrl && /\.(jpe?g|png|webp)($|\?)/i.test(imageUrl)) {
      endpoint = `${SLIP2GO_BASE_URL}/api/verify-slip/qr-image-link/info`;
      payload = {
        imageUrl,
        checkCondition,
      };
    } else if (imageBase64) {
      // ตรวจสอบ format ของ Base64 ว่ามี prefix หรือไม่
      const finalBase64 = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;
      endpoint = `${SLIP2GO_BASE_URL}/api/verify-slip/qr-base64/info`;
      payload = {
        imageBase64: finalBase64,
        checkCondition,
      };
    } else {
      return NextResponse.json(
        { ok: false, error: "ไม่พบข้อมูลสำหรับตรวจสอบสลิป" },
        { status: 400 }
      );
    }

    // เรียก Slip2Go API พร้อม Authorization Header
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SLIP2GO_SECRET_KEY}`,
      },
      body: JSON.stringify({ payload }),
    });

    const data = await res.json();

    // แปลงข้อความ error ให้เข้าใจง่ายภาษาไทยตาม Slip2Go Response Codes
    let userMessage = data.message || "ตรวจสอบสลิปไม่ผ่าน";
    const isSuccess = data.code === "200000" || data.code === "200200" || data.code === "200001" || data.code === "200202";

    if (isSuccess) {
      userMessage = "สลิปถูกต้อง ยอดเงินและบัญชีปลายทางถูกต้อง";
    } else if (data.code === "200401") {
      userMessage = "บัญชีผู้รับไม่ถูกต้อง (ต้องโอนเข้า ธ.กรุงไทย 1370404514 น.ส. ปุณยาพร สิงห์ลอ)";
    } else if (data.code === "200402") {
      userMessage = `ยอดโอนเงินไม่ตรงเงื่อนไข (ต้องโอนอย่างน้อย ${expectedAmount || 200} บาท)`;
    } else if (data.code === "200403") {
      userMessage = "วันที่โอนไม่ตรงกับเงื่อนไขที่กำหนด";
    } else if (data.code === "200404") {
      userMessage = "ไม่พบข้อมูลสลิปนี้ในระบบธนาคาร หรือสลิปยังไม่เข้าระบบ";
    } else if (data.code === "200501") {
      userMessage = "สลิปนี้เคยถูกใช้งานในระบบไปแล้ว (สลิปซ้ำ)";
    } else if (data.code === "200500" || data.code === "400001") {
      userMessage = "ไม่พบ QR Code ของธนาคารในรูป หรือสลิปไม่ถูกต้อง";
    } else if (data.code === "200502") {
      userMessage = "ระบบธนาคารขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง";
    }

    return NextResponse.json({
      ok: isSuccess,
      code: data.code,
      message: userMessage,
      data: data.data || null,
      methodUsed: qrCode ? "qr-code" : endpoint.includes("image-link") ? "image-link" : "base64",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการตรวจสอบสลิป";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
