import "../styles/globals.css";
import type { ReactNode } from "react";
import WhopIframeClientProvider from "@/app/providers/WhopIframeClient";

export const metadata = {
  title: "AI Content Engine",
  description: "Prepare your videos for every platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-[#0A0A0A] text-white">
        {/* Initialize Whop iframe SDK on client if present */}
        <WhopIframeClientProvider />
        {children}
      </body>
    </html>
  );
}


