"use client";

import Image from "next/image";
import { useState } from "react";
import type { PreviewSide } from "@/lib/types";

type Props = {
  colorHex: string;
  designUrl: string | null;
  side: PreviewSide;
  zoom?: boolean;
};

/** SVG tee silhouette — design overlaid on chest zone for instant previews */
export function TeePreview({ colorHex, designUrl, side, zoom }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const scale = zoom ? 1.12 : 1;

  const showFront = side === "front";

  return (
    <div
      className="relative mx-auto w-full max-w-[min(420px,90vw)] select-none rounded-3xl bg-zinc-100 p-6 shadow-inner ring-1 ring-black/5"
      data-testid="tee-preview"
    >
      <div
        className="relative mx-auto aspect-[380/460] overflow-visible transition-transform duration-200"
        style={{ transform: `scale(${scale})` }}
      >
        <svg
          viewBox="0 0 280 340"
          className="relative z-10 h-full w-full drop-shadow-xl"
          aria-hidden
        >
          <defs>
            <linearGradient id="teeShade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
            </linearGradient>
          </defs>
          {/* Torso */}
          <path
            fill={colorHex}
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="1.5"
            d="
              M92 118
              Q88 118 76 138
              L68 218
              Q66 278 74 296
              L206 296
              Q214 278 212 218
              L204 138
              Q192 118 188 118
              L174 132
              L106 132
              Z"
          />
          {/* Left sleeve */}
          <path
            fill={colorHex}
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="1.25"
            d="M92 118 L56 154 L74 218 L68 218 L76 138 Z"
          />
          {/* Right sleeve */}
          <path
            fill={colorHex}
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="1.25"
            d="M188 118 L224 154 L206 218 L212 218 L204 138 Z"
          />
          {/* Neck rib */}
          <ellipse
            cx="140"
            cy="124"
            rx="34"
            ry="14"
            fill={colorHex}
            stroke="rgba(0,0,0,0.12)"
          />
          <ellipse
            cx="140"
            cy="128"
            rx="22"
            ry="11"
            fill="rgba(0,0,0,0.2)"
          />
          <path
            fill="url(#teeShade)"
            d="
              M92 118 Q88 118 76 138 L68 218 Q66 278 74 296 L206 296 Q214 278 212 218 L204 138 Q192 118 188 118
              Z"
          />
          {!showFront && (
            <text
              x="140"
              y="220"
              textAnchor="middle"
              fill="rgba(0,0,0,0.25)"
              className="text-[11px] font-semibold uppercase"
              fontSize="10"
              fontFamily="sans-serif"
            >
              Back preview · same print area
            </text>
          )}
        </svg>

        {/* Chest print — percentages tuned for viewBox */}
        {showFront && designUrl ? (
          <div
            className="pointer-events-none absolute left-1/2 top-[44%] z-20 w-[38%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-md shadow-md ring-1 ring-black/10"
            style={{ aspectRatio: "1 / 1" }}
          >
            {!imgLoaded ? <div className="skeleton absolute inset-0 rounded-md" /> : null}
            <Image
              src={designUrl}
              alt=""
              width={380}
              height={380}
              className={`h-full w-full object-cover transition-opacity duration-150 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImgLoaded(true)}
              priority
              unoptimized
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
