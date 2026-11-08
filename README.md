# โอมจ๋า (Ohmjaa)

เว็บสำหรับครูห้อง ม.2/3 ใช้ติดตามการบ้าน ค้นหาข้อมูลนักเรียน บันทึกและติดตามพฤติกรรม ดูรายงาน และพิมพ์เอกสาร A4

## เริ่มใช้งานในเครื่อง

ต้องมี Node.js และ npm (แนะนำ Node.js 22 ขึ้นไปสำหรับ Supabase SDK ที่ติดตั้งอยู่)

```bash
npm ci
```

สร้าง `.env.local` ในโฟลเดอร์หลัก:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

จากนั้นรัน:

```bash
npm run dev
```

เปิด `http://localhost:3000` หากไม่มีข้อมูลนักเรียนจาก Supabase หน้าแรกจะใช้ `src/data/students.json` เป็นข้อมูลสำรอง

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ใช้ทำอะไร |
| --- | --- |
| `npm run dev` | เปิดเซิร์ฟเวอร์พัฒนา |
| `npx tsc --noEmit` | ตรวจ TypeScript |
| `npm run build` | สร้าง production build |
| `npm run start` | เปิด production build |

## ส่วนสำคัญของระบบ

- หน้าแรกอยู่ที่ `src/app/page.tsx` และ UI หลักอยู่ที่ `src/components/DisciplinaryApp.tsx`
- Supabase client อยู่ที่ `src/utils/supabase/`; การอ่านและแก้ไขข้อมูลที่ UI ปัจจุบันเรียกใช้อยู่ใน `src/app/actions.ts`
- แบบข้อมูลอยู่ที่ `src/types/penalty.ts`; การคำนวณวันทำเวรอยู่ที่ `src/lib/choreSchedule.ts`
- รายงานในแอปใช้ `window.print()` เพื่อพิมพ์หรือเลือกบันทึกเป็น PDF จากเบราว์เซอร์; `html/report.html` เป็นหน้า HTML แยก
- SQL สำหรับตั้งฐานข้อมูลอยู่ใน `supabase/` อ่านไฟล์ migration และตรวจ policy ก่อนนำไปใช้กับฐานข้อมูลจริง

## ข้อควรรู้ก่อนใช้งานจริง

- หน้า `/login` ปัจจุบัน redirect ไป `/` และหน้า `/` ยังไม่ได้ใช้ `teacherActions.ts` เพื่อจำกัดข้อมูลตามบัญชีครู อย่าถือว่า UI ปัจจุบันมีการบังคับสิทธิ์ครูครบถ้วน
- วันหยุดโรงเรียนและวันเวรประจำสัปดาห์ที่ครูกำหนดเก็บใน `localStorage` ของเบราว์เซอร์เครื่องนั้น จึงยังไม่ซิงก์ข้ามเครื่อง
- ระบบคิดวันทำเวรโดยข้ามเสาร์–อาทิตย์และวันหยุดที่กรอกไว้ ระยะเวลาแบบเทอมหรือปีการศึกษายังไม่ถูกแปลงเป็นจำนวนวันอัตโนมัติ
- `@vercel/analytics` ติดตั้งเป็น dependency แล้ว แต่ยังไม่ได้วาง Analytics component ใน layout

ดูรายละเอียดโครงสร้างและสถานะงานใน [CONTEXT.md](CONTEXT.md) และแนวทางแก้โค้ดใน [AGENTS.md](AGENTS.md)
