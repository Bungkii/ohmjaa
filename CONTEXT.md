# Project context

## เป้าหมายและผู้ใช้

Ohmjaa เป็นเว็บสำหรับครูห้อง ม.2/3 เพื่อดูงานที่ต้องติดตาม บันทึกวินัย ค้นหานักเรียน ตรวจประวัติ และพิมพ์รายงาน ภาษา UI หลักเป็นภาษาไทย และต้องใช้ได้ทั้งมือถือ แท็บเล็ต และคอมพิวเตอร์

## สถานะการทำงานปัจจุบัน

- Next.js 16 App Router, React 19, TypeScript และ Tailwind CSS 4
- `src/app/page.tsx` อ่านนักเรียน บันทึกวินัย การบ้าน และสถานะส่งงานจาก Supabase แล้วส่งให้ `DisciplinaryApp` ถ้าอ่านไม่สำเร็จจะใช้รายชื่อนักเรียนสำรองและชุดข้อมูลอื่นเป็นค่าว่าง
- `DisciplinaryApp` เป็น client component ที่มีหน้า ภาพรวม, งานวันนี้, การบ้าน, นักเรียน, บันทึกวินัย, ประวัติ/รายงาน และการแก้ไข
- การบันทึก ลบ และแก้ไขจาก UI ปัจจุบันเรียก `src/app/actions.ts` ซึ่งใช้ browser Supabase client และมี local cache บางส่วน
- การถามยืนยันก่อนลบใช้ Headless UI Dialog; การแจ้งผลใช้ `react-hot-toast`
- รายงานพิมพ์ด้วย `window.print()` และ print CSS ใน `src/app/globals.css`; หน้า HTML แยก `html/report.html` มี print stylesheet ของตนเอง
- ตารางทำเวรคำนวณใน `src/lib/choreSchedule.ts` โดยใช้วันที่บันทึกตามเวลา Asia/Bangkok เป็นจุดเริ่ม ข้ามเสาร์–อาทิตย์และวันหยุดโรงเรียนที่กรอก

## แผนที่ไฟล์

| พื้นที่ | ไฟล์ |
| --- | --- |
| หน้าและ layout | `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` |
| UI หลัก | `src/components/DisciplinaryApp.tsx` |
| การทำงานกับข้อมูล | `src/app/actions.ts`, `src/app/teacherActions.ts`, `src/utils/supabase/` |
| ชนิดข้อมูลและการคำนวณ | `src/types/penalty.ts`, `src/lib/choreSchedule.ts` |
| ข้อมูลสำรอง | `src/data/students.json` |
| SQL | `supabase/` |
| หน้า HTML แยก | `html/report.html`, `index.html` |

## ข้อจำกัดที่ต้องทราบ

1. `src/app/login/page.tsx` redirect ไป `/`; `teacherActions.ts` มี server actions สำหรับตรวจสิทธิ์ แต่หน้า `/` และ `DisciplinaryApp` ปัจจุบันยังไม่เรียกใช้ชุดนั้น เอกสาร `docs/teacher-setup.md` และ `docs/superpowers/plans/` อธิบายแผน/การตั้งค่าที่อาจไม่ตรงกับเส้นทาง UI ปัจจุบันทั้งหมด
2. SQL ใน `supabase/` มีหลาย migration และ policy คนละช่วงเวลา ต้องตรวจฐานข้อมูลจริงก่อนรัน migration ใด ๆ โดยเฉพาะข้อมูลนักเรียนและสิทธิ์เข้าถึง
3. `ohmjaa_school_holidays` และ `ohmjaa_weekly_duty` เก็บใน `localStorage` ต่อเบราว์เซอร์ ไม่ใช่ข้อมูลส่วนกลาง
4. ระยะเวลาทำเวรแบบวันและสัปดาห์คิดเป็นวันเรียน (1 สัปดาห์ = 5 วันเรียน); แบบเดือนนับวันเรียนในช่วงเดือนปฏิทิน; แบบเทอม ปีการศึกษา หรือข้อความกำหนดเองบางแบบยังไม่รวมยอดวัน
5. `@vercel/analytics` มีใน dependencies แต่ยังไม่เปิดใช้งานใน UI; โปรเจกต์ไม่ได้ติดตั้ง `sonner` หรือมี `components.json` ของ shadcn/ui

## แนวทางตรวจงาน

รัน `npx tsc --noEmit` และ `npm run build` หลังแก้ส่วนที่กระทบการทำงานจริง หาก Turbopack ในสภาพแวดล้อมนี้มีปัญหาเฉพาะการสร้าง process ให้ลอง `npx next build --webpack` และรายงานวิธีที่ใช้จริง ตรวจ `git diff --check` ก่อน commit และอย่ารวมไฟล์ที่ไม่ได้เกี่ยวข้องกับงาน
