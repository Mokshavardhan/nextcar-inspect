import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";

export const metadata: Metadata = {
  title: "NextCar Inspect — Precision Vehicle Inspection & Diagnostics Platform",
  description:
    "Book certified mobile and bay vehicle inspections online. Comprehensive pre-purchase, used car, and 150+ point diagnostic reports verified by automotive specialists.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8FAFC] text-[#172033] antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
