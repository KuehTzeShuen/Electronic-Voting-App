import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavbarWrapper from "@/components/navbar-wrapper"; // 👈 new wrapper

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Votely",
  description: "Electronic Voting Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        suppressHydrationWarning
        className={`dark ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* ✅ Navbar wrapper (handles hiding logic) */}
        <NavbarWrapper />

        <div className="min-h-screen w-full">
          {children}
        </div>
      </body>
    </html>
  );
}
