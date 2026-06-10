import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ChatWidget } from "@/components/ChatWidget";
import { Navbar } from "@/components/Navbar";
import { WhatsAppButton } from "@/components/WhatsAppButton";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Gharsip · Home-Style Meals & Tiffin Subscriptions",
  description:
    "Fresh home-style meals delivered daily. Browse today's combos, subscribe to a monthly tiffin plan, and order on WhatsApp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="min-h-[100dvh] bg-white text-zinc-900 antialiased font-sans">
        <Navbar />
        <main>{children}</main>
        <WhatsAppButton />
        <ChatWidget />
      </body>
    </html>
  );
}
