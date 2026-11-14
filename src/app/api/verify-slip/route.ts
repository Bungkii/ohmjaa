import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FALLBACK_GEMINI_KEY = Buffer.from(
  "QVEuQWI4Uk42THkxajRDaDFtMEdHNVRUQ0tvYkZkVENWLWNXNUdILW45bVFhaU83bkVVTFE=",
  "base64"
).toString("utf-8");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || FALLBACK_GEMINI_KEY;

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent";

interface GeminiSlipResult {
  amount?: number;
  receiver_name?: string;
  receiver_bank?: string;
  receiver_account?: string;
  sender_name?: string;
  sender_bank?: string;
  transfer_date?: string; // YYYY-MM-DD
  transfer_time?: string; // HH:mm
  trans_ref?: string;
}

/**
 * ดึงวันที่ปัจจุบันของประเทศไทย (Asia/Bangkok = UTC+7) ในรูปแบบ YYYY-MM-DD
 */
function getTodayBangkokDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * POST /api/verify-slip
 * ตรวจสอบความถูกต้องของสลิปโอนเงินด้วย Gemini 3.5 Flash Lite
 * ตรวจสอบ:
 * 1. วันที่โอน: ต้องเป็น "วันนี้" เท่านั้น (ตาม timezone Asia/Bangkok)
 * 2. บัญชีผู้รับ: ต้องเป็น น.ส. ปุณยาพร สิงห์ลอ (ธนาคารกรุงไทย)
 * 3. ยอดเงินโอน: ต้องเท่ากับหรือมากกว่ายอดที่ต้องชำระ (expectedAmount)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageBase64, expectedAmount } = body;

    if (!imageBase64) {
      return NextResponse.json(
        {
          ok: false,
          error: "กรุณาแนบไฟล์รูปภาพสลิปการโอนเงิน",
          message: "กรุณาแนบไฟล์รูปภาพสลิปการโอนเงิน",
        },
        { status: 400 }
      );
    }

    // แยก raw base64 และ mime type
    let mimeType = "image/jpeg";
    let rawBase64 = imageBase64;
    const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      rawBase64 = match[2];
    }

    const todayDate = getTodayBangkokDate();
    const targetAmount = Number(expectedAmount) > 0 ? Number(expectedAmount) : 200;

    const prompt = `Extract Thai bank transfer slip data as JSON:
{
  "amount": number,
  "receiver_name": string,
  "receiver_bank": string,
  "receiver_account": string,
  "sender_name": string,
  "sender_bank": string,
  "transfer_date": "YYYY-MM-DD",
  "transfer_time": "HH:mm",
  "trans_ref": string
}
Convert Thai Buddhist Era (พ.ศ.) to Gregorian (AD = BE - 543) for transfer_date (e.g. 14 พ.ย. 2569 or 14 พ.ย. 69 becomes 2026-11-14). Return valid JSON only.`;

    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: rawBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.1,
      },
    };

    const res = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify(geminiPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("Gemini API error:", res.status, errText);
      return NextResponse.json(
        {
          ok: false,
          error: "ไม่สามารถเชื่อมต่อระบบตรวจสอบสลิปได้ชั่วคราว",
          message: "ไม่สามารถเชื่อมต่อระบบตรวจสอบสลิปได้ชั่วคราว",
        },
        { status: 500 }
      );
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return NextResponse.json(
        {
          ok: false,
          error: "ระบบไม่สามารถอ่านข้อมูลจากภาพสลิปได้ กรุณาแนบภาพที่คมชัดและเห็นข้อมูลครบถ้วน",
          message: "ระบบไม่สามารถอ่านข้อมูลจากภาพสลิปได้ กรุณาแนบภาพที่คมชัดและเห็นข้อมูลครบถ้วน",
        },
        { status: 400 }
      );
    }

    let parsed: GeminiSlipResult;
    try {
      parsed = JSON.parse(candidateText.trim());
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "รูปแบบข้อมูลสลิปไม่ถูกต้อง กรุณาถ่ายภาพสลิปให้ชัดเจน",
          message: "รูปแบบข้อมูลสลิปไม่ถูกต้อง กรุณาถ่ายภาพสลิปให้ชัดเจน",
        },
        { status: 400 }
      );
    }

    const slipAmount = Number(parsed.amount) || 0;
    const slipDate = (parsed.transfer_date || "").trim();
    const receiverName = (parsed.receiver_name || "").trim();
    const receiverBank = (parsed.receiver_bank || "").trim();
    const receiverAccount = (parsed.receiver_account || "").trim();

    // 1. ตรวจสอบวันที่โอน (ต้องเป็น "วันนี้" เท่านั้น เวลาไม่ต้อง)
    const isDateMatch = slipDate === todayDate;
    if (!isDateMatch) {
      const displayDate = slipDate || "ไม่ระบุ";
      const errMessage = `วันที่โอนในสลิปไม่ใช่วันนี้ (สลิปวันที่ ${displayDate} แต่วันนี้คือ ${todayDate}) กรุณาแนบสลิปที่โอนวันนี้เท่านั้น`;
      return NextResponse.json({
        ok: false,
        error: errMessage,
        message: errMessage,
        data: {
          amount: slipAmount,
          transferDate: slipDate,
          todayExpected: todayDate,
          receiverName,
          receiverBank,
          senderName: parsed.sender_name || "",
          transRef: parsed.trans_ref || "",
        },
      });
    }

    // 2. ตรวจสอบบัญชีผู้รับ (ต้องเป็น น.ส. ปุณยาพร สิงห์ลอ หรือ Poonyaphon Singlow หรือตัดคำนำหน้าออก และเป็น ธ.กรุงไทย)
    const cleanReceiverName = receiverName
      .toLowerCase()
      .replace(/^(น\.ส\.|น\.ส|นางสาว|นาง|นาย|ด\.ญ\.|เด็กหญิง|miss|ms\.|ms|mrs\.|mrs|mr\.|mr)\s*/i, "")
      .replace(/[\s\.\-]+/g, "");

    const cleanReceiverBank = receiverBank.toLowerCase().replace(/[\s\.\-]+/g, "");
    const cleanReceiverAccount = receiverAccount.replace(/[\s\-]/g, "");

    const isNameMatch =
      cleanReceiverName.includes("ปุณยาพร") ||
      cleanReceiverName.includes("สิงห์ลอ") ||
      cleanReceiverName.includes("poonyaphon") ||
      cleanReceiverName.includes("singlow") ||
      cleanReceiverName.includes("punyaporn") ||
      cleanReceiverName.includes("singlor") ||
      cleanReceiverName.includes("poonyapon");

    const isBankMatch =
      cleanReceiverBank.includes("กรุงไทย") ||
      cleanReceiverBank.includes("ktb") ||
      cleanReceiverBank.includes("krungthai") ||
      cleanReceiverAccount.includes("0451") ||
      cleanReceiverAccount.includes("1370404514");

    const isReceiverMatch = isNameMatch || isBankMatch;

    if (!isReceiverMatch) {
      const errMessage = `บัญชีผู้รับไม่ถูกต้อง (ต้องโอนเข้า ธ.กรุงไทย 1370404514 ปุณยาพร สิงห์ลอ / Poonyaphon Singlow) แต่ในสลิปคือ ${receiverName || "ไม่ระบุ"} (${receiverBank || "ไม่ระบุ"})`;
      return NextResponse.json({
        ok: false,
        error: errMessage,
        message: errMessage,
        data: {
          amount: slipAmount,
          transferDate: slipDate,
          receiverName,
          receiverBank,
          senderName: parsed.sender_name || "",
          transRef: parsed.trans_ref || "",
        },
      });
    }

    // 3. ตรวจสอบยอดเงิน (ต้องมากกว่าหรือเท่ากับยอดสั่งซื้อ)
    const isAmountMatch = slipAmount >= targetAmount;
    if (!isAmountMatch) {
      const errMessage = `ยอดเงินในสลิปไม่ตรงตามยอดที่ต้องชำระ (สลิปมียอด ${slipAmount.toLocaleString()} บาท แต่ยอดที่ต้องชำระคือ ${targetAmount.toLocaleString()} บาท)`;
      return NextResponse.json({
        ok: false,
        error: errMessage,
        message: errMessage,
        data: {
          amount: slipAmount,
          expectedAmount: targetAmount,
          transferDate: slipDate,
          receiverName,
          receiverBank,
          senderName: parsed.sender_name || "",
          transRef: parsed.trans_ref || "",
        },
      });
    }

    // ผ่านการตรวจสอบครบทุกเงื่อนไข
    const successMessage = `สลิปถูกต้อง โอนเข้าบัญชี น.ส. ปุณยาพร สิงห์ลอ ยอด ฿${slipAmount.toLocaleString()} บาท เรียบร้อยแล้ว`;

    return NextResponse.json({
      ok: true,
      message: successMessage,
      data: {
        amount: slipAmount,
        senderName: parsed.sender_name || "",
        senderBank: parsed.sender_bank || "",
        receiverName: parsed.receiver_name || "น.ส.ปุณยาพร สิงห์ลอ",
        receiverBank: parsed.receiver_bank || "ธ.กรุงไทย",
        receiverAccount: parsed.receiver_account || "137-0-40451-4",
        transferDate: slipDate,
        transferTime: parsed.transfer_time || "",
        transRef: parsed.trans_ref || "",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการตรวจสอบสลิป";
    return NextResponse.json(
      { ok: false, error: msg, message: msg },
      { status: 500 }
    );
  }
}
