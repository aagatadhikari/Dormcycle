import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DormCycle | Campus Marketplace",
  description: "Buy, sell, and connect within your campus community.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
