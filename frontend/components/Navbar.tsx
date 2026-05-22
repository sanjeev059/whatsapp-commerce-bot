"use client";

import Link from "next/link";
import { useCart } from "@/lib/CartContext";

export function Navbar() {
  const { lines } = useCart();
  const count = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/96 backdrop-blur-md shadow-sm">
      {/* Announcement bar */}
      <div className="bg-brand py-1.5 text-center text-[11px] font-semibold text-white tracking-wide">
        🎉 Free shipping on orders above ₹499 · Pan India delivery in 4–5 days
      </div>

      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white font-extrabold text-sm shadow-sm">
            G
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-brand">Gharsip</span>
            <span className="text-[13px] font-extrabold text-zinc-900">Custom Prints</span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/shop" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-brand transition-colors sm:block">
            Shop
          </Link>
          <Link href="/gallery" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-brand transition-colors sm:block">
            Gallery
          </Link>
          <Link href="/customize" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-brand transition-colors sm:block">
            Design
          </Link>
          <Link href="/track" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-brand transition-colors sm:block">
            Track
          </Link>

          <Link href="/shop" className="hidden rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-dark transition-colors sm:inline-flex">
            Shop Now
          </Link>

          {/* Cart */}
          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:border-brand hover:text-brand transition-colors"
            aria-label="Cart"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            {count > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                {count}
              </span>
            ) : null}
          </Link>
        </nav>
      </div>
    </header>
  );
}
