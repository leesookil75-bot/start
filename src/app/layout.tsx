import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import InstallPrompt from "@/components/InstallPrompt";
import { CapacitorPermissionGuard } from "@/components/CapacitorGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "가로",
  description: "가로청소 현장 기록 앱",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "가로",
  },
  openGraph: {
    title: "가로",
    description: "가로청소 작업 기록 및 출퇴근 안심 시스템",
    url: "https://clean-track-leesookils-projects.vercel.app",
    siteName: "가로",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "가로 앱 아이콘",
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
        <CapacitorPermissionGuard>
          <InstallPrompt />
          {children}
        </CapacitorPermissionGuard>
      </body>
    </html>
  );
}
