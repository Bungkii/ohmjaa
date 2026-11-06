import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "โอมจ๋า ม.2/3 | การบ้านและบันทึกวินัย",
  description: "ดูการบ้านและบันทึกวินัยของนักเรียนชั้น ม.2/3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f5f3ef] text-[#182422] font-sans selection:bg-[#dce9e2] selection:text-[#173d36]">
        {children}
      </body>
    </html>
  );
}
