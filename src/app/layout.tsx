import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Walltracker",
  description: "A local-first ceiling tracker for aircraft and other moving worlds.",
};

export const viewport: Viewport = {
  themeColor: "#030711",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
