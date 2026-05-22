import Image from "next/image";
import Link from "next/link";
import type { Design } from "@/lib/designs";

const TAG_COLORS: Record<string, string> = {
  Popular: "bg-amber-400 text-amber-900",
  New: "bg-sky-500 text-white",
  Trending: "bg-rose-500 text-white",
};

export function DesignCard({ design, compact }: { design: Design; compact?: boolean }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
        compact ? "" : "flex flex-col"
      }`}
    >
      {/* Category pill */}
      <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-brand/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
        {design.category}
      </span>

      {/* Tag badge */}
      {design.tag ? (
        <span
          className={`absolute right-2.5 top-2.5 z-10 rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-sm ${TAG_COLORS[design.tag] ?? "bg-zinc-700 text-white"}`}
        >
          {design.tag}
        </span>
      ) : null}

      {/* Image */}
      <div className={`relative bg-zinc-100 ${compact ? "aspect-square" : "aspect-[5/6]"}`}>
        <Image
          src={design.imageUrl}
          alt={design.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          sizes="(max-width:640px) 45vw, 240px"
          unoptimized
        />
      </div>

      {/* Info */}
      <div className={`flex flex-col gap-1.5 p-3 ${compact ? "" : "flex-1"}`}>
        <p className="line-clamp-2 text-sm font-bold text-zinc-900">{design.name}</p>

        {/* Stars */}
        <div className="flex items-center gap-1">
          <span className="text-amber-400" style={{ fontSize: 11 }}>★★★★★</span>
          <span className="text-[10px] text-zinc-400">(4.8)</span>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold text-brand">₹{design.price}</p>
          <p className="text-[10px] text-zinc-400 line-through">₹{Math.round(design.price * 1.2)}</p>
        </div>

        <Link
          href={`/customize?design=${design.id}`}
          className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-dark"
        >
          Customize
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>
    </div>
  );
}
