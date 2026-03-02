import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scio — Podcast claim context & verification",
  description:
    "Empower podcast listeners to access context, verification, and deeper understanding of claims made in podcast episodes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
