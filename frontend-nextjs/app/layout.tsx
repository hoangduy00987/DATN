import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "AI LungCare - Hệ thống Chẩn đoán & Tư vấn Bệnh phổi",
  description: "Hệ thống trí tuệ nhân tạo hỗ trợ phân tích hình ảnh X-quang và tư vấn sức khỏe hô hấp.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
