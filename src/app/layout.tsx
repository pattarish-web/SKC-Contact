import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "สั่งการ คลีน | จัดทำสัญญาบริการทำความสะอาด",
  description:
    "กรอกข้อมูลลูกค้าแล้วพิมพ์สัญญาจ้างทำความสะอาดของบริษัท สั่งการ คลีน จำกัด พร้อมเอกสารแนบท้าย",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${sarabun.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
