import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "หจก.โชคมงคลฟาร์ม - จำหน่ายอาหารสัตว์และอุปกรณ์การเกษตรครบวงจร",
  description: "ศูนย์รวมอาหารสัตว์คุณภาพสูง ปุ๋ย ยา และอุปกรณ์การเกษตรทุกชนิด ที่ หจก.โชคมงคลฟาร์ม บริการด้วยใจ ส่งไว สินค้าได้มาตรฐานเพื่อเกษตรกรไทย",
  keywords: [
    "โชคมงคลฟาร์ม",
    "ขายอาหารสัตว์",
    "อุปกรณ์การเกษตร",
    "ขายปุ๋ยยา",
    "ราคาส่ง",
    "เกษตรกรรม",
    "อาหารวัว",
    "อาหารไก่",
    "อาหารหมู",
    "อาหารสัตว์",
    "อาหารปลา",
    "ปุ๋ย",
    "ยา",
    "อุปกรณ์การเกษตร"
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head><meta name="google-site-verification" content="iw5-Z-JjI9Vmi8rUi4OyN0Cn-SOCTBLDHusXJYkYl_M" /></head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
