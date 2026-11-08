# Project context

## เป้าหมายและผู้ใช้

Ohmjaa เป็นเว็บสำหรับครูห้อง ม.2/3 เพื่อติดตามวินัย ค้นหานักเรียน ตรวจประวัติ และพิมพ์รายงาน ภาษา UI หลักเป็นภาษาไทย และต้องใช้ได้ทั้งมือถือ แท็บเล็ต และคอมพิวเตอร์

## สถานะการทำงานปัจจุบัน

- Next.js 16 App Router, React 19, TypeScript และ Tailwind CSS 4
- `src/app/page.tsx` อ่านนักเรียน บันทึกวินัย และวันเวรประจำจาก Supabase แล้วส่งให้ `DisciplinaryApp` ถ้าอ่านไม่สำเร็จจะใช้รายชื่อนักเรียนสำรองและชุดข้อมูลอื่นเป็นค่าว่าง
- `DisciplinaryApp` เป็น client component ที่มีหน้า ภาพรวม, ติดตามวินัย, นักเรียน, กิจกรรม & สุ่มกลุ่ม, บันทึกวินัย, ประวัติ/รายงาน และการแก้ไข
- หน้ากิจกรรม & สุ่มกลุ่มใช้คอมโพเนนต์ `src/components/ActivitiesAndGrouping.tsx` และวงล้อสุ่ม `src/components/SpinWheel.tsx` รองรับการหมุนวงล้อสุ่มนักเรียน (ฟิสิกส์ชะลอความเร็ว, ระบบกลับทิศทางข้อความอัตโนมัติไม่ให้ตัวหนังสือกลับหัว, รองรับ HiDPI ทุกระดับสเกลและปรับขนาดวงล้อให้พอดีกับหน้าจอ, ค้นหารายชื่อในวงล้อ, เสียงสังเคราะห์ Web Audio, ตัดชื่อออก), สุ่มกลุ่ม (คละเพศ, สุ่มหัวหน้า), ระบบข้อมูลกิจกรรมพิเศษ/ไซส์เสื้อ (สรุปยอดรวม, เช็คชำระเงิน, มอบหมายหน้าที่) และไดอะล็อกตั้งค่าคอลัมน์/ช่องลงชื่อก่อนพิมพ์รายงาน A4 รูปแบบมาตรฐานโรงเรียน บันทึกสถานะใน `localStorage`
- การลบรายการวินัยและไดอะล็อกยืนยันรองรับแอนิเมชั่น (Framer Motion `AnimatePresence` slide/fade out และ Headless UI transition) พร้อมสถานะกำลังลบ
- การบันทึก ลบ และแก้ไขจาก UI ปัจจุบันเรียก `src/app/actions.ts` ซึ่งใช้ browser Supabase client และมี local cache บางส่วน
- การถามยืนยันก่อนลบใช้ Headless UI Dialog; การแจ้งผลใช้ `react-hot-toast`
- รายงานพิมพ์ด้วย `window.print()` และ print CSS ใน `src/app/globals.css`; หน้า HTML แยก `html/report.html` มี print stylesheet ของตนเอง
- ตารางทำเวรคำนวณใน `src/lib/choreSchedule.ts` โดยใช้วันที่บันทึกตามเวลา Asia/Bangkok เป็นจุดเริ่ม ข้ามเสาร์–อาทิตย์และวันหยุดโรงเรียนที่กรอก

## แผนที่ไฟล์

| พื้นที่ | ไฟล์ |
| --- | --- |
| หน้าและ layout | `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` |
| UI หลัก | `src/components/DisciplinaryApp.tsx`, `src/components/ActivitiesAndGrouping.tsx`, `src/components/SpinWheel.tsx` |
| การทำงานกับข้อมูล | `src/app/actions.ts`, `src/app/teacherActions.ts`, `src/utils/supabase/` |
| ชนิดข้อมูลและการคำนวณ | `src/types/penalty.ts`, `src/types/activities.ts`, `src/lib/choreSchedule.ts` |
| ข้อมูลสำรอง | `src/data/students.json` |
| SQL | `supabase/` |
| หน้า HTML แยก | `html/report.html`, `index.html` |

## ข้อจำกัดที่ต้องทราบ

1. `src/app/login/page.tsx` redirect ไป `/`; `teacherActions.ts` มี server actions สำหรับตรวจสิทธิ์ แต่หน้า `/` และ `DisciplinaryApp` ปัจจุบันยังไม่เรียกใช้ชุดนั้น เอกสาร `docs/teacher-setup.md` และ `docs/superpowers/plans/` อธิบายแผน/การตั้งค่าที่อาจไม่ตรงกับเส้นทาง UI ปัจจุบันทั้งหมด
2. SQL ใน `supabase/` มีหลาย migration และ policy คนละช่วงเวลา ต้องตรวจฐานข้อมูลจริงก่อนรัน migration ใด ๆ โดยเฉพาะข้อมูลนักเรียนและสิทธิ์เข้าถึง
3. `ohmjaa_school_holidays` ยังเก็บใน `localStorage` ต่อเบราว์เซอร์ ส่วนวันเวรประจำสัปดาห์เตรียมอ่านจาก `student_weekly_duty` ซึ่งเว็บไม่มีสิทธิ์เขียน ต้องตรวจและรัน `supabase/migration_student_weekly_duty.sql` แล้วกรอกตารางเวรผ่านช่องทางผู้ดูแลฐานข้อมูล
4. ระยะเวลาทำเวรแบบวันและสัปดาห์คิดเป็นวันเรียน (1 สัปดาห์ = 5 วันเรียน); แบบเดือนนับวันเรียนในช่วงเดือนปฏิทิน; แบบเทอม ปีการศึกษา หรือข้อความกำหนดเองบางแบบยังไม่รวมยอดวัน
5. `@vercel/analytics` มีใน dependencies แต่ยังไม่เปิดใช้งานใน UI; โปรเจกต์ไม่ได้ติดตั้ง `sonner` หรือมี `components.json` ของ shadcn/ui

## แนวทางตรวจงาน

รัน `npx tsc --noEmit` และ `npm run build` หลังแก้ส่วนที่กระทบการทำงานจริง หาก Turbopack ในสภาพแวดล้อมนี้มีปัญหาเฉพาะการสร้าง process ให้ลอง `npx next build --webpack` และรายงานวิธีที่ใช้จริง ตรวจ `git diff --check` ก่อน commit และอย่ารวมไฟล์ที่ไม่ได้เกี่ยวข้องกับงาน
