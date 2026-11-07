import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "โอมจ๋า ม.2/3 | การบ้านและบันทึกวินัย",
  description: "ระบบติดตามการบ้านและบันทึกวินัยนักเรียน ห้อง ม.2/3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full antialiased scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/LINESeedSansTH/LINESeedSansTH.css"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-[#151b2e] selection:bg-[#dce9e2] selection:text-[#16453d]">
        {children}
      </body>
    </html>
  );
}
