import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HyperGlueX - HyperLiquid Dashboard",
  description: "Analytics and monitoring dashboard for HyperLiquid",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
