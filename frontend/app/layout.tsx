import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HData | Secret Vault",
  description: "Secure file storage",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full bg-[#0a0a0f]">{children}</body>
    </html>
  );
}