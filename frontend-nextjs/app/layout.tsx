import "./globals.css";
import "./login-shell.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI LungCare - Hệ thống Chẩn đoán & Tư vấn Bệnh phổi",
  description: "Hệ thống trí tuệ nhân tạo hỗ trợ phân tích hình ảnh X-quang và tư vấn sức khỏe hô hấp.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
