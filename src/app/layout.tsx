import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/components/locale-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { HeaderAuthLink } from "@/components/header-auth-link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: "My AI Brand Studio",
  description: "AI-powered social media content operating system.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text">
        <AuthProvider>
          <LocaleProvider>
            <header className="border-b border-border">
              <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-text-muted">
                  My AI Brand Studio
                </span>
                <div className="flex items-center gap-3">
                  <HeaderAuthLink />
                  <LanguageToggle />
                </div>
              </div>
            </header>
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
              {children}
            </main>
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
