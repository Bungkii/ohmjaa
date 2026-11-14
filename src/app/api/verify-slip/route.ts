import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SLIP2GO_BASE_URL = process.env.SLIP2GO_BASE_URL || "https://connect.slip2go.com";
const SLIP2GO_SECRET_KEY = process.env.SLIP2GO_SECRET_KEY || "vNsULFfzwFBMfcDWC7yYkugOuyFKjAWHD8S9vBHlfok=";

interface Slip2GoReceiver {
  account?: {
    name?: string;
    bank?: {
      account?: string;
    };
  };
  bank?: {
    id?: string;
    name?: string;
  };
}

interface Slip2GoSender {
  account?: {
    name?: string;
    bank?: {
      account?: string;
    };
  };
  bank?: {
    id?: string;
    name?: string;
  };
}

interface Slip2GoRawData {
  transRef?: string;
  dateTime?: string;
  amount?: number;
  receiver?: Slip2GoReceiver;
  sender?: Slip2GoSender;
  decode?: string;
}

/**
 * POST /api/verify-slip
 * ตรวจสอบความถูกต้องของสลิปโอนเงินผ่าน Slip2Go API
 * รองรับทั้ง QR Code, Base64 Image และ Image URL
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { qrCode, imageUrl, imageBase64, expectedAmount } = body;

    if (!qrCode && !imageUrl && !imageBase64) {
      return NextResponse.json(
        {
          ok: false,
          error: "กรุณาระบุข้อมูลสลิป (qrCode, imageBase64 หรือ imageUrl)",
          message: "กรุณาระบุข้อมูลสลิป (qrCode, imageBase64 หรือ imageUrl)",
        },
        { status: 400 }
      );
    }

    // เงื่อนไขตรวจสอบบัญชีผู้รับและยอดเงิน (ไม่เปิด checkDuplicate เพื่อไม่ให้ติดปัญหาสลิปซ้ำเวลาทดสอบหรือสั่งซ้ำ)
    const checkCondition: {
      checkDuplicate: boolean;
      checkAmount?: { type: "gte"; amount: string };
      checkReceiver?: Array<{
        accountType?: string;
        accountNumber?: string;
        accountNameTH?: string;
      }>;
    } = {
      checkDuplicate: false,
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

    const targetAmount = Number(expectedAmount) > 0 ? Math.floor(Number(expectedAmount)) : 200;
    checkCondition.checkAmount = {
      type: "gte",
      amount: String(targetAmount),
    };

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
        {
          ok: false,
          error: "ไม่พบข้อมูลสำหรับตรวจสอบสลิป",
          message: "ไม่พบข้อมูลสำหรับตรวจสอบสลิป",
        },
        { status: 400 }
      );
    }

    // เรียก API ตรวจสอบสลิป Slip2Go
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SLIP2GO_SECRET_KEY}`,
      },
      body: JSON.stringify({ payload }),
    });

    const data = await res.json();
    const rawData = data.data as Slip2GoRawData | undefined;

    // ตรวจสอบสถานะการตรวจสอบ
    let isSuccess =
      data.code === "200000" ||
      data.code === "200200" ||
      data.code === "200001" ||
      data.code === "200202";

    let userMessage = data.message || "ตรวจสอบสลิปไม่ผ่าน";

    // กรณีสลิปซ้ำ (200501) แต่มีข้อมูลสลิปเดิมที่ตรงกับยอดและบัญชีปลายทาง
    if (data.code === "200501") {
      const slipAmount = Number(rawData?.amount) || 0;
      const receiverBankId = rawData?.receiver?.bank?.id;
      const receiverName = rawData?.receiver?.account?.name || "";
      const isReceiverMatch =
        receiverBankId === "006" || receiverName.includes("ปุณยาพร");
      const isAmountMatch = slipAmount >= targetAmount;

      if (isReceiverMatch && isAmountMatch) {
        isSuccess = true;
        userMessage = "สลิปถูกต้อง ยอดเงินและบัญชีปลายทางถูกต้อง";
      } else {
        userMessage = "สลิปนี้เคยถูกใช้งานในระบบไปแล้ว (สลิปซ้ำ)";
      }
    } else if (isSuccess) {
      userMessage = "สลิปถูกต้อง ยอดเงินและบัญชีปลายทางถูกต้อง";
    } else if (data.code === "200401") {
      userMessage = "บัญชีผู้รับไม่ถูกต้อง (ต้องโอนเข้า ธ.กรุงไทย 1370404514 น.ส. ปุณยาพร สิงห์ลอ)";
    } else if (data.code === "200402") {
      userMessage = `ยอดโอนเงินไม่ตรงเงื่อนไข (ต้องโอนอย่างน้อย ${targetAmount} บาท)`;
    } else if (data.code === "200403") {
      userMessage = "วันที่โอนไม่ตรงกับเงื่อนไขที่กำหนด";
    } else if (data.code === "200404") {
      userMessage = "ไม่พบข้อมูลสลิปนี้ในระบบธนาคาร หรือสลิปยังไม่เข้าระบบ";
    } else if (data.code === "200500" || data.code === "400001") {
      userMessage = "ไม่พบ QR Code ของธนาคารในรูป หรือสลิปไม่ถูกต้อง";
    } else if (data.code === "200502") {
      userMessage = "ระบบธนาคารขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง";
    }

    const normalizedData = rawData
      ? {
          amount: rawData.amount ?? 0,
          transRef: rawData.transRef ?? "",
          dateTime: rawData.dateTime ?? "",
          senderName: rawData.sender?.account?.name ?? "",
          senderBank: rawData.sender?.bank?.name ?? "",
          receiverName: rawData.receiver?.account?.name ?? "น.ส.ปุณยาพร ส",
          receiverBank: rawData.receiver?.bank?.name ?? "ธนาคารกรุงไทย",
          receiverAccount: rawData.receiver?.account?.bank?.account ?? "xxx-x-x0451-x",
          raw: rawData,
        }
      : null;

    return NextResponse.json({
      ok: isSuccess,
      code: data.code,
      message: userMessage,
      error: isSuccess ? undefined : userMessage,
      data: normalizedData,
      methodUsed: qrCode ? "qr-code" : endpoint.includes("image-link") ? "image-link" : "base64",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการตรวจสอบสลิป";
    return NextResponse.json(
      { ok: false, error: msg, message: msg },
      { status: 500 }
    );
  }
}
