import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from '@/components/layout/AppShell';
import { AuthProvider } from '@/context/AuthContext';
import ClientOnly from '@/components/utils/ClientOnly';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Potato Chat",
  description: "A real-time communication platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ClientOnly>
            <AppShell>
              {children}
            </AppShell>
          </ClientOnly>
        </AuthProvider>
      </body>
    </html>
  );
}
