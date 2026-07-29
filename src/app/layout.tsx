import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { BottomNav } from "@/components/BottomNav";
import { ThemeProvider } from "@/components/ThemeProvider";

// Roda antes da hidratação para não piscar o tema errado.
// A chave 'my-gym-theme' precisa bater com THEME_STORAGE_KEY em ThemeProvider.tsx.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('my-gym-theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MY GYM",
  description: "App de musculação focado em progressão de carga",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#f3f2f2",
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
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-base-100 min-h-screen flex justify-center`}
      >
        <div className="w-full max-w-[430px] bg-base-100 min-h-screen relative flex flex-col">
          <ThemeProvider>
            <Providers>
              <main className="flex-1 overflow-y-auto pb-24">
                {children}
              </main>
              <BottomNav />
            </Providers>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
