import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HarvestPulse — Adaptive smart irrigation for Sri Lankan paddy schemes",
  description:
    "Adaptive Smart Irrigation and Crop Optimization Platform. Four coupled modules — sensing, crop health, forecasting, and optimization — guide every millimetre of water from reservoir to root.",
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
