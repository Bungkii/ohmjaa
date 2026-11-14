import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "แบบฟอร์มสั่งเสื้อห้อง ม.2/3 | โรงเรียนอัสสัมชัญธนบุรี",
  description: "แบบฟอร์มสั่งจองเสื้อห้อง ม.2/3 โรงเรียนอัสสัมชัญธนบุรี ปีการศึกษา 2569",
  openGraph: {
    title: "แบบฟอร์มสั่งเสื้อห้อง ม.2/3 | โรงเรียนอัสสัมชัญธนบุรี",
    description: "สั่งจองเสื้อห้อง ม.2/3 โรงเรียนอัสสัมชัญธนบุรี ปีการศึกษา 2569",
  },
};

export default function ShirtOrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
