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

/**
 * Realistic crew-neck t-shirt — viewBox 460×560
 *
 * Sleeve angle: ~32° from horizontal (natural flat-lay look)
 * Body: slight A-line (wider at hem than shoulder)
 * Collar: proper crew-neck rib with depth shadow
 *
 * Key landmarks (SVG units):
 *   Collar notch L (155,55)  R (305,55)  bottom (230,92)
 *   Shoulder      L (100,88) R (360,88)
 *   Sleeve outer  L (20,138) R (440,138)
 *   Sleeve cuff   L (20,178) R (440,178)
 *   Underarm      L (105,172) R (355,172)
 *   Body start    L (105,155) R (355,155)
 *   Hem           L (82,520)  R (378,520)
 */

const TEE_PATH =
  "M 155 55 " +
  "C 130 53 108 63 100 88 " +      // collar-L → shoulder-L
  "C 76 104 44 124 20 138 " +      // shoulder-L → sleeve outer top
  "L 20 178 " +                     // sleeve outer down
  "C 20 188 28 196 42 198 " +      // cuff outer corner
  "L 78 198 " +                     // across cuff
  "C 92 196 102 188 104 176 " +    // cuff inner corner
  "L 105 155 " +                    // inner sleeve up to body
  "C 103 230 96 370 82 520 " +     // body L down (slight outward taper)
  "L 378 520 " +                    // hem
  "C 364 370 357 230 355 155 " +   // body R up
  "L 356 176 " +                    // inner sleeve
  "C 358 188 368 196 382 198 " +   // right cuff inner
  "L 418 198 " +                    // across right cuff
  "C 432 196 440 188 440 178 " +   // right cuff outer
  "L 440 138 " +                    // right sleeve outer up
  "C 416 124 384 104 360 88 " +    // sleeve outer → shoulder-R
  "C 352 63 330 53 305 55 " +      // shoulder-R → collar-R
  "C 296 68 284 80 272 86 " +      // collar-R curve in
  "Q 230 94 188 86 " +             // collar bottom arc
  "C 176 80 164 68 155 55 Z";      // collar-L curve back

const COLLAR_OUTER =
  "M 155 55 " +
  "C 163 40 196 34 230 34 " +
  "C 264 34 297 40 305 55 " +
  "C 296 68 284 80 272 86 " +
  "Q 230 94 188 86 " +
  "C 176 80 164 68 155 55 Z";

const COLLAR_INNER =
  "M 163 59 " +
  "C 172 46 200 40 230 40 " +
  "C 260 40 288 46 297 59 " +
  "C 288 72 278 84 272 86 " +
  "Q 230 94 188 86 " +
  "C 182 84 172 72 163 59 Z";

export function TeePreview({ colorHex, designUrl, side, zoom }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const scale = zoom ? 1.08 : 1;
  const showFront = side === "front";

  // Detect light-coloured shirts so we boost the stroke for visibility
  const isLight = (() => {
    const h = colorHex.replace("#", "");
    if (h.length !== 6) return false;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 200;
  })();

  const strokeColor = isLight ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.10)";
  const bgClass = isLight ? "bg-zinc-300" : "bg-zinc-200";

  return (
    <div
      className={`relative mx-auto w-full max-w-[min(440px,90vw)] select-none rounded-3xl ${bgClass} p-5 shadow-inner ring-1 ring-black/10`}
      data-testid="tee-preview"
    >
      <div
        className="relative mx-auto aspect-[460/560] overflow-visible transition-transform duration-200"
        style={{ transform: `scale(${scale})` }}
      >
        <svg viewBox="0 0 460 560" className="relative z-10 h-full w-full" aria-hidden>
          <defs>
            {/* Drop shadow — stronger so white shirts are visible */}
            <filter id="teeShadow" x="-14%" y="-6%" width="128%" height="126%">
              <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#000" floodOpacity="0.28" />
            </filter>

            {/* Horizontal side-edge darkening */}
            <linearGradient id="sideShade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#000" stopOpacity="0.20" />
              <stop offset="10%"  stopColor="#000" stopOpacity="0.05" />
              <stop offset="50%"  stopColor="#fff" stopOpacity="0.06" />
              <stop offset="90%"  stopColor="#000" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.20" />
            </linearGradient>

            {/* Top light / bottom shadow */}
            <linearGradient id="topShade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#fff" stopOpacity="0.18" />
              <stop offset="28%"  stopColor="#fff" stopOpacity="0.04" />
              <stop offset="70%"  stopColor="#000" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
            </linearGradient>

            {/* Chest highlight */}
            <radialGradient id="chestHL" cx="50%" cy="36%" r="34%">
              <stop offset="0%"   stopColor="#fff" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0.00" />
            </radialGradient>

            <clipPath id="teeClip">
              <path d={TEE_PATH} />
            </clipPath>
          </defs>

          {/* ── SHIRT BODY ── */}
          <g filter="url(#teeShadow)">
            <path
              d={TEE_PATH}
              fill={colorHex}
              stroke={strokeColor}
              strokeWidth={isLight ? "2" : "1.5"}
              strokeLinejoin="round"
            />
          </g>

          {/* ── FABRIC SHADING ── */}
          <g clipPath="url(#teeClip)">
            <rect x="0" y="0" width="460" height="560" fill="url(#sideShade)" />
            <rect x="0" y="0" width="460" height="560" fill="url(#topShade)" />
            <rect x="0" y="0" width="460" height="560" fill="url(#chestHL)" />

            {/* ── SEAM LINES ── */}
            {/* Shoulder seams */}
            <path d="M 105 155 C 102 128 100 106 100 88"
              fill="none" stroke="rgba(0,0,0,0.09)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 355 155 C 358 128 360 106 360 88"
              fill="none" stroke="rgba(0,0,0,0.09)" strokeWidth="1.5" strokeLinecap="round" />

            {/* Body side seams */}
            <path d="M 105 162 C 100 280 92 390 82 520"
              fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" strokeLinecap="round" />
            <path d="M 355 162 C 360 280 368 390 378 520"
              fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" strokeLinecap="round" />

            {/* Sleeve underarm seams */}
            <path d="M 104 174 C 68 176 44 178 20 178"
              fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="1" strokeLinecap="round" />
            <path d="M 356 174 C 392 176 416 178 440 178"
              fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="1" strokeLinecap="round" />

            {/* Cuff stitching */}
            <path d="M 21 193 L 78 195"
              fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="2" strokeLinecap="round" />
            <path d="M 382 195 L 439 193"
              fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="2" strokeLinecap="round" />

            {/* Hem stitching */}
            <path d="M 84 515 L 376 515"
              fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="2" strokeLinecap="round" />

            {/* Subtle centre crease */}
            <path d="M 230 155 C 228 270 226 380 228 520"
              fill="none" stroke="rgba(0,0,0,0.035)" strokeWidth="8" strokeLinecap="round" />

            {/* Back label */}
            {!showFront && (
              <text x="230" y="300" textAnchor="middle" fill="rgba(0,0,0,0.13)"
                fontSize="11" fontFamily="sans-serif" fontWeight="600" letterSpacing="5">
                BACK VIEW
              </text>
            )}
          </g>

          {/* ── COLLAR RIB ── */}
          <path d={COLLAR_OUTER} fill={colorHex} stroke={strokeColor} strokeWidth={isLight ? "2" : "1.5"} />
          <path d={COLLAR_INNER} fill="rgba(0,0,0,0.26)" />
          {/* Collar inner highlight (fabric thickness) */}
          <path
            d="M 164 60 C 174 48 202 42 230 42 C 258 42 286 48 296 60"
            fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="1.5" strokeLinecap="round"
          />
        </svg>

        {/* ── CHEST DESIGN PRINT ── */}
        {showFront && designUrl ? (
          <div
            className="pointer-events-none absolute left-1/2 z-20"
            style={{ top: "40%", width: "26%", aspectRatio: "1/1", transform: "translate(-50%,-50%)" }}
          >
            {/* Embossed shadow under the print */}
            <div
              className="absolute inset-0 rounded-sm blur-md"
              style={{ background: "rgba(0,0,0,0.18)", transform: "scale(1.08) translateY(3px)" }}
            />
            {!imgLoaded && <div className="skeleton absolute inset-0 rounded-sm" />}
            <Image
              src={designUrl}
              alt=""
              width={480}
              height={480}
              className={`relative z-10 h-full w-full object-contain rounded-sm transition-opacity duration-200 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImgLoaded(true)}
              priority
              unoptimized
            />
            {/* Screen-print sheen */}
            <div
              className="absolute inset-0 z-20 rounded-sm pointer-events-none"
              style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.12) 0%,transparent 55%,rgba(0,0,0,0.07) 100%)" }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
