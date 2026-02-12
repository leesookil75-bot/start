import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import InstallPrompt from "@/components/InstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clean Track",
  description: "Track your waste bag usage",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Clean Track",
  },
  openGraph: {
    title: "Clean Track - 쓰레기 봉투 사용량 기록",
    description: "간편하게 사용량을 기록하고 통계를 확인하세요.",
    url: "https://clean-track-leesookils-projects.vercel.app",
    siteName: "Clean Track",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "Clean Track Icon",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <InstallPrompt />
        {children}
      </body>
    </html>
  );
}
