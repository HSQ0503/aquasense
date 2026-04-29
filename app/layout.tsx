import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aquasense — Lake Tibet",
  description:
    "Live water-quality readings — turbidity, temperature, and pH — from a sensor on Lake Tibet at Tibet Butler Preserve in Windermere, Florida.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plexMono.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
