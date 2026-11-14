import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DormCycle — Don't toss it. Keep it going.",
  description: "A student-to-student marketplace for dorm essentials, useful finds, and convenient campus handoffs.",
  icons: { icon: "/brand/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
