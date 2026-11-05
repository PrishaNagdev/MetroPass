import type { Metadata } from "next";
import { Roboto, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Roboto({ subsets: ["latin"], weight: ["400","500","700"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Ahmedabad Metro — Contactless Biometric Ticketing",
  description: "Official Ahmedabad Metro (આપણી મેટ્રો) Biometric Turnstile Ticketing System.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body className="min-h-screen w-full overflow-x-hidden font-sans">{children}</body>
    </html>
  );
}
