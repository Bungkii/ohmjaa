import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import { Gavel, ExternalLink } from "lucide-react";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-ibm-plex-sans-thai",
});

export const metadata: Metadata = {
  title: "โอมจ๋า ม.2/3 | ระบบจัดการบทลงโทษและวินัยนักเรียน",
  description:
    "ระบบบันทึกและจัดการบทลงโทษนักเรียนชั้น ม.2/3 เชื่อมต่อกับระบบพริมจ๋า (Kanbann)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${ibmPlexSansThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800 font-sans">
        {/* Navigation Bar / Header */}
        <header className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white shadow-md sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-xs flex items-center justify-center">
                <Gavel className="h-6 w-6 text-amber-200" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                  โอมจ๋า
                  <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-medium">
                    ม.2/3
                  </span>
                </h1>
                <p className="text-xs text-rose-100 hidden sm:block">
                  ระบบบันทึกและจัดการบทลงโทษนักเรียน เชื่อมต่อระบบเดียวกับพริมจ๋า
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="https://primjaa.bungkii.app"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg border border-white/20 font-medium transition-colors"
              >
                <span>พริมจ๋า (Kanbann)</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <div className="flex items-center text-xs bg-black/15 px-3 py-1.5 rounded-lg border border-white/10 font-medium">
                คุณครูผู้ดูแลห้อง ม.2/3
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 flex flex-col">{children}</main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200/80 text-slate-500 py-4 text-center text-xs mt-auto">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              แอปพลิเคชันโอมจ๋า &copy; ห้อง ม.2/3 | สถาปัตยกรรม Next.js + Supabase SSR
            </div>
            <div className="text-slate-400">
              เชื่อมโยงฐานข้อมูลรายชื่อร่วมกับระบบ Kanbann ม.2/3
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

