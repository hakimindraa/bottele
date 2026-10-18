import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Berita AI",
  description: "Ringkasan berita harian otomatis bertenaga AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
