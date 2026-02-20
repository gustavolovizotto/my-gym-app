import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { BottomNav } from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fitness Evolution App",
  description: "App de musculação focado em progressão de carga",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#000000",
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
    <html lang="pt-BR" data-theme="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-base-100 min-h-screen flex justify-center`}
      >
        <div className="w-full max-w-[500px] bg-base-100 min-h-screen relative flex flex-col">
          <Providers>
            <main className="flex-1 overflow-y-auto pb-24">
              {children}
            </main>
            <BottomNav />
          </Providers>
        </div>
      </body>
    </html>
  );
}
