"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/CartContext";

const NAV_LINKS = [
  { href: "/shop",     label: "T-Shirts"       },
  { href: "/saree",   label: "Saree Services"  },
  { href: "/gallery", label: "Designs"         },
  { href: "/customize", label: "Customise"     },
  { href: "/track",   label: "Track Order"     },
];

export function Navbar() {
  const { lines } = useCart();
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/96 backdrop-blur-md shadow-sm">
      {/* Announcement bar */}
      <div className="bg-brand py-1.5 text-center text-[11px] font-semibold text-white tracking-wide">
        🎉 Custom T-shirts · Saree Services · Home Pickup in Bengaluru
      </div>

      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white font-extrabold text-sm shadow-sm">
            G
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-brand">Gharsip</span>
            <span className="text-[13px] font-extrabold text-zinc-900">Wear Your Vibe</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-brand transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/saree#booking"
            className="ml-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-dark transition-colors"
          >
            Book Now
          </Link>
        </nav>

        <div className="flex items-center gap-2">
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
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>

          {/* Hamburger */}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700 hover:border-brand hover:text-brand transition-colors lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-zinc-100 bg-white px-4 pb-4 pt-2 lg:hidden">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block rounded-xl px-3 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-brand transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/saree#booking"
            onClick={() => setMenuOpen(false)}
            className="mt-2 block rounded-xl bg-brand px-3 py-3 text-center text-sm font-bold text-white hover:bg-brand-dark transition-colors"
          >
            Book Saree Service
          </Link>
        </div>
      )}
    </header>
  );
}
