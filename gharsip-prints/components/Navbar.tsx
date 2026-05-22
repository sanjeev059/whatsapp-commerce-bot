"use client";

import Link from "next/link";
import { useCart } from "@/lib/CartContext";

export function Navbar() {
  const { lines } = useCart();
  const count = lines.reduce((s, l) => s + l.qty, 0);

  const link =
    "text-sm font-medium text-zinc-600 hover:text-brand transition-colors";
  const pill =
    "inline-flex items-center justify-center min-w-[1.35rem] h-6 px-1.5 rounded-full bg-brand text-white text-xs font-bold";

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">
            Gharsip
          </span>
          <span className="font-extrabold text-zinc-900">Custom Prints</span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link href="/customize" className={link}>
            Design
          </Link>
          <Link href="/gallery" className={`${link} hidden sm:inline`}>
            Gallery
          </Link>
          <Link href="/track" className={`${link} hidden sm:inline`}>
            Track
          </Link>
          <Link href="/cart" className={`${link} flex items-center gap-2`}>
            Cart
            {count > 0 ? <span className={pill}>{count}</span> : null}
          </Link>
        </nav>
      </div>
      <div className="border-t border-brand/10 bg-brand-muted py-1 text-center text-[10px] font-medium text-brand-dark sm:hidden">
        Wear Your Vibe
      </div>
    </header>
  );
}
