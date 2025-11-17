import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poker Table - Play Chips",
  description: "Online poker table with play chips - no real money",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
