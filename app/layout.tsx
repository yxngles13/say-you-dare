import type { Metadata, Viewport } from "next";
import { blackletter, typewriter } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Say You Dare",
  description: "A party game built around secret dares.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0c0a0a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${blackletter.variable} ${typewriter.variable}`}>
      <body>
        <div className="backdrop" />
        <main className="app">{children}</main>
      </body>
    </html>
  );
}
