import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";

import "./globals.css";

const displayFont = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display"
});

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "Peserta Wisuda",
  description: "Riwayat peserta wisuda per periode"
};

import { Suspense } from "react";

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <Suspense>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
