import type { Metadata } from "next";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { Web3Provider } from "@/providers/Web3Provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "BIS - HyperLiquid Dashboard",
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
        <Web3Provider>
          {children}
          <Toaster position="top-right" richColors />
        </Web3Provider>
      </body>
    </html>
  );
}
