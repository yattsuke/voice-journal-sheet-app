import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "音声日記",
  description: "Androidで録音し、OpenAIで文字起こしと整形を行い、Googleスプレッドシートへ保存する日記アプリ。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
