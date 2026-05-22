import Image from "next/image";
import Link from "next/link";
import type { Design } from "@/lib/designs";

export function DesignCard({
  design,
  compact,
}: {
  design: Design;
  compact?: boolean;
}) {
  return (
    <div
      className={`group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md ${
        compact ? "" : "flex flex-col"
      }`}
    >
      <div className={`relative bg-zinc-100 ${compact ? "aspect-square" : "aspect-[5/6]"}`}>
        <Image
          src={design.imageUrl}
          alt={design.name}
          fill
          className="object-cover transition group-hover:scale-[1.02]"
          sizes="(max-width:640px) 45vw, 200px"
          unoptimized
        />
        <span className="absolute left-2 top-2 rounded-full bg-brand/90 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
          {design.category}
        </span>
      </div>
      <div className={`flex flex-col gap-1 p-3 ${compact ? "" : "flex-1"}`}>
        <p className="line-clamp-2 text-sm font-bold text-zinc-900">{design.name}</p>
        <p className="text-xs text-zinc-500">Design · ₹{design.price}</p>
        <Link
          href={`/customize?design=${design.id}`}
          className="mt-auto inline-flex items-center justify-center rounded-xl bg-brand py-2 text-xs font-bold text-white hover:bg-brand-dark"
        >
          Customize
        </Link>
      </div>
    </div>
  );
}
