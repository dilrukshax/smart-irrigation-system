import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adaptive Smart Irrigation and Crop Optimization Platform",
  description:
    "Marketing website for a 4th year research project integrating IoT irrigation, crop health detection, forecasting, and crop area optimization.",
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
