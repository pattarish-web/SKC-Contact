import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "สั่งการ คลีน | จัดทำสัญญาบริการทำความสะอาด",
  description:
    "กรอกข้อมูลลูกค้าแล้วพิมพ์สัญญาจ้างทำความสะอาด คลังกลางอัปเดตทุกเครื่องทันที",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${sarabun.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
