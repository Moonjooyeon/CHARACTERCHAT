import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "온서 · 이야기가 되는 대화",
  description: "나만의 세계와 캐릭터를 만들고, 새로운 이야기를 시작하세요. 비공개 제작 MVP.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
