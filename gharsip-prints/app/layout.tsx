import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/CartContext";
import { Navbar } from "@/components/Navbar";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Gharsip Custom Prints · Wear Your Vibe",
  description:
    "Design your perfect tee. Pick a design, pick a colour, preview live — order online.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="min-h-[100dvh] bg-white text-zinc-900 antialiased font-sans">
        <CartProvider>
          <Navbar />
          <main>{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
