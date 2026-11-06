import type { Metadata } from "next";
import "./globals.css";
import { Gavel, User } from "lucide-react";

export const metadata: Metadata = {
  title: "โอมจ๋า - แอปจัดการบทลงโทษ ม.2/3",
  description: "ระบบบันทึกและจัดการบทลงโทษนักเรียนชั้น ม.2/3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full antialiased">
      <head>
        {/* Google Font API: Prompt */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 text-slate-800 min-h-screen flex flex-col font-sans">
        {/* Header / Navbar */}
        <header className="bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md flex items-center justify-center">
                <Gavel className="h-6 w-6 text-yellow-200" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  โอมจ๋า{" "}
                  <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-normal">
                    ม.2/3
                  </span>
                </h1>
                <p className="text-xs text-rose-100">
                  ระบบบันทึกและจัดการบทลงโทษนักเรียน
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center text-xs bg-black/10 px-3 py-1.5 rounded-lg border border-white/10 gap-1.5">
              <User className="h-4 w-4" />
              <span>คุณครูผู้ดูแลห้อง ม.2/3</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">{children}</div>

        {/* Footer */}
        <footer className="bg-slate-100 border-t border-slate-200 text-slate-500 py-4 text-center text-xs mt-auto">
          แอปพลิเคชันโอมจ๋า &copy; ห้อง ม.2/3 | พัฒนาขึ้นสำหรับการจัดการระเบียบวินัยในชั้นเรียน
        </footer>
      </body>
    </html>
  );
}
