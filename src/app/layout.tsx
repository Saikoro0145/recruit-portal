import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "就活スケジュール管理",
  description: "就職活動インターンシップ管理アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <nav className="border-b bg-card shadow-sm">
          <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-3 sm:gap-6">
            <Link href="/" className="font-bold text-lg tracking-tight">
              就活スケジュール管理
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                ダッシュボード
              </Link>
              <Link
                href="/calendar"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                カレンダー
              </Link>
              <Link
                href="/companies"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                企業一覧
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-screen-2xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
