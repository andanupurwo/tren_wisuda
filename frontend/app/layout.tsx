import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "WisudaDB — Dashboard Peserta Wisuda",
  description: "Dashboard tren dan riwayat peserta wisuda per periode",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <Suspense>{children}</Suspense>
      </body>
    </html>
  );
}
