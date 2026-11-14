import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DormCycle — buy & sell in your dorm community",
  description: "A student marketplace for dorm furniture, textbooks, electronics and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
