import "../styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "AI Content Engine",
  description: "Prepare your videos for every platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-[#0A0A0A] text-white">
        {/* Load iFrame SDK when embedded; React wrapper removed due to peer constraints */}
        <script src="https://cdn.whop.com/iframe-sdk.js" async />
        {children}
      </body>
    </html>
  );
}


