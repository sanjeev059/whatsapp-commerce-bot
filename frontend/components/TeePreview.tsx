"use client";

import Image from "next/image";
import { useState } from "react";
import type { PreviewSide } from "@/lib/types";

type Props = {
  colorHex: string;
  /** Front chest design URL (shown when side === "front") */
  designUrl: string | null;
  /** Back design URL (shown when side === "back") */
  backDesignUrl?: string | null;
  side: PreviewSide;
  zoom?: boolean;
};

/*
 * T-shirt silhouette — viewBox 480 × 560
 * Based on real garment measurements (medium, 10 px / inch):
 *   Collar notch   L(160,62)  R(320,62)   bottom(240,96)
 *   Shoulder seam  L(108,86)  R(372,86)
 *   Sleeve outer   L(24,128)  R(456,128)   sleeve angle ≈ 27°
 *   Sleeve cuff    L(24,170)  R(456,170)   cuff depth 42 px
 *   Armhole        L(108,166) R(372,166)
 *   Body sides     L(90,506)  R(390,506)   slight A-line
 */
const TEE_PATH =
  "M 160 62 " +
  "C 134 60 114 68 108 86 " +       // collar-L → shoulder seam
  "C 82 100 50 116 24 128 " +       // shoulder → sleeve outer top
  "L 24 170 " +                      // sleeve outer edge down
  "C 24 180 34 188 48 190 " +       // cuff outer corner
  "L 82 188 " +                      // across cuff
  "C 96 186 108 178 108 166 " +     // cuff inner → armhole
  "C 106 290 100 410 90 506 " +     // body left side (gentle outward taper)
  "L 390 506 " +                     // hem
  "C 380 410 374 290 372 166 " +    // body right side
  "C 372 178 384 186 398 188 " +    // right armhole → cuff inner
  "L 432 190 " +                     // across right cuff
  "C 446 188 456 180 456 170 " +    // right cuff outer corner
  "L 456 128 " +                     // right sleeve outer up
  "C 430 116 398 100 372 86 " +     // right sleeve → right shoulder
  "C 366 68 346 60 320 62 " +       // right shoulder → collar-R
  "C 310 74 298 84 288 90 " +       // collar-R curve in
  "Q 240 98 192 90 " +              // collar bottom arc
  "C 182 84 170 74 160 62 Z";       // collar-L back

// Collar rib (sits on top — same colour, slight border)
const COLLAR_OUTER =
  "M 160 62 " +
  "C 168 44 204 36 240 36 " +
  "C 276 36 312 44 320 62 " +
  "C 310 74 298 84 288 90 " +
  "Q 240 98 192 90 " +
  "C 182 84 170 74 160 62 Z";

// Dark inner fill — depth inside the collar tube
const COLLAR_INNER =
  "M 170 67 " +
  "C 180 52 210 45 240 45 " +
  "C 270 45 300 52 310 67 " +
  "C 300 80 290 88 288 90 " +
  "Q 240 98 192 90 " +
  "C 190 88 180 80 170 67 Z";

// Underside shading of left sleeve (makes it look 3-D)
const SLEEVE_SHADOW_L =
  "M 24 128 L 24 170 C 48 158 74 144 108 136 L 108 100 C 76 112 48 122 24 128 Z";

const SLEEVE_SHADOW_R =
  "M 456 128 L 456 170 C 432 158 406 144 372 136 L 372 100 C 404 112 432 122 456 128 Z";

// Armhole shadow — fold where sleeve meets body
const ARMHOLE_SHADOW_L =
  "M 108 86 C 106 110 106 138 108 166 C 102 152 100 126 104 102 Z";

const ARMHOLE_SHADOW_R =
  "M 372 86 C 374 110 374 138 372 166 C 378 152 380 126 376 102 Z";

export function TeePreview({ colorHex, designUrl, backDesignUrl, side, zoom }: Props) {
  const [frontLoaded, setFrontLoaded] = useState(false);
  const [backLoaded, setBackLoaded] = useState(false);
  const scale = zoom ? 1.07 : 1;
  const showFront = side === "front";
  const activeDesignUrl = showFront ? designUrl : (backDesignUrl ?? null);
  const imgLoaded = showFront ? frontLoaded : backLoaded;
  const setImgLoaded = showFront ? setFrontLoaded : setBackLoaded;

  // Luminance — boost stroke/bg for light-coloured shirts
  const isLight = (() => {
    const h = colorHex.replace("#", "");
    if (h.length !== 6) return false;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 190;
  })();

  const stroke = isLight ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.12)";
  const sw = isLight ? "2" : "1.5";

  return (
    <div
      className={`relative mx-auto w-full max-w-[min(440px,90vw)] select-none rounded-3xl p-5 shadow-inner ring-1 ring-black/10 ${isLight ? "bg-zinc-400/60" : "bg-zinc-300/70"}`}
      data-testid="tee-preview"
    >
      <div
        className="relative mx-auto aspect-[480/560] overflow-visible transition-transform duration-200"
        style={{ transform: `scale(${scale})` }}
      >
        <svg viewBox="0 0 480 560" className="relative z-10 h-full w-full" aria-hidden>
          <defs>
            {/* ── Drop shadow ── */}
            <filter id="teeShadow" x="-16%" y="-8%" width="132%" height="130%">
              <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#000" floodOpacity="0.30" />
            </filter>

            {/* ── Horizontal edge darkening ── */}
            <linearGradient id="sideG" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#000" stopOpacity="0.22" />
              <stop offset="8%"   stopColor="#000" stopOpacity="0.06" />
              <stop offset="50%"  stopColor="#fff" stopOpacity="0.05" />
              <stop offset="92%"  stopColor="#000" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
            </linearGradient>

            {/* ── Top highlight / bottom shadow ── */}
            <linearGradient id="topG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#fff" stopOpacity="0.20" />
              <stop offset="25%"  stopColor="#fff" stopOpacity="0.04" />
              <stop offset="72%"  stopColor="#000" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.20" />
            </linearGradient>

            {/* ── Chest oval highlight (light source from above) ── */}
            <radialGradient id="chestG" cx="50%" cy="34%" r="32%">
              <stop offset="0%"   stopColor="#fff" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0.00" />
            </radialGradient>

            <clipPath id="teeClip">
              <path d={TEE_PATH} />
            </clipPath>
          </defs>

          {/* ── SHIRT BODY (with drop shadow) ── */}
          <g filter="url(#teeShadow)">
            <path d={TEE_PATH} fill={colorHex} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          </g>

          {/* ── SLEEVE 3-D UNDERSIDE SHADOWS ── */}
          <path d={SLEEVE_SHADOW_L} fill="rgba(0,0,0,0.10)" />
          <path d={SLEEVE_SHADOW_R} fill="rgba(0,0,0,0.10)" />

          {/* ── ARMHOLE FOLD SHADOWS ── */}
          <path d={ARMHOLE_SHADOW_L} fill="rgba(0,0,0,0.09)" />
          <path d={ARMHOLE_SHADOW_R} fill="rgba(0,0,0,0.09)" />

          {/* ── FABRIC SHADING OVERLAYS (clipped to shirt) ── */}
          <g clipPath="url(#teeClip)">
            <rect x="0" y="0" width="480" height="560" fill="url(#sideG)" />
            <rect x="0" y="0" width="480" height="560" fill="url(#topG)" />
            <rect x="0" y="0" width="480" height="560" fill="url(#chestG)" />

            {/* Shoulder seam stitching — left */}
            <path d="M 160 62 C 134 60 114 68 108 86"
              fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="1.2" strokeLinecap="round" />
            {/* Shoulder seam stitching — right */}
            <path d="M 320 62 C 346 60 366 68 372 86"
              fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="1.2" strokeLinecap="round" />

            {/* Body side seams */}
            <path d="M 108 166 C 106 290 100 410 90 506"
              fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="1" strokeLinecap="round" />
            <path d="M 372 166 C 374 290 380 410 390 506"
              fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="1" strokeLinecap="round" />

            {/* Sleeve underarm seam lines */}
            <path d="M 108 166 C 80 170 52 172 24 170"
              fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1" strokeLinecap="round" />
            <path d="M 372 166 C 400 170 428 172 456 170"
              fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1" strokeLinecap="round" />

            {/* Cuff hem stitching */}
            <path d="M 26 185 L 82 184"
              fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="2" strokeLinecap="round" />
            <path d="M 398 184 L 454 185"
              fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="2" strokeLinecap="round" />

            {/* Body hem stitching */}
            <path d="M 92 502 L 388 502"
              fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="2" strokeLinecap="round" />

            {/* Subtle centre crease */}
            <path d="M 240 166 C 238 290 236 400 238 506"
              fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="9" strokeLinecap="round" />

            {/* Back label */}
            {!showFront && (
              <text x="240" y="300" textAnchor="middle" fill="rgba(0,0,0,0.14)"
                fontSize="12" fontFamily="sans-serif" fontWeight="600" letterSpacing="5">
                BACK VIEW
              </text>
            )}
          </g>

          {/* ── COLLAR RIB ── */}
          <path d={COLLAR_OUTER} fill={colorHex} stroke={stroke} strokeWidth={sw} />
          {/* Collar depth shadow */}
          <path d={COLLAR_INNER} fill="rgba(0,0,0,0.28)" />
          {/* Collar inner-edge highlight (shows rib thickness) */}
          <path
            d="M 170 68 C 182 54 210 47 240 47 C 270 47 298 54 310 68"
            fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round"
          />
          {/* Collar outer highlight */}
          <path
            d="M 164 62 C 172 46 206 38 240 38 C 274 38 308 46 316 62"
            fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" strokeLinecap="round"
          />
        </svg>

        {/* ── DESIGN PRINT (front or back) ── */}
        {activeDesignUrl ? (
          <div
            className="pointer-events-none absolute left-1/2 z-20"
            style={{ top: "41%", width: "27%", aspectRatio: "1/1", transform: "translate(-50%,-50%)" }}
          >
            <div
              className="absolute inset-0 rounded blur-md"
              style={{ background: "rgba(0,0,0,0.20)", transform: "scale(1.10) translateY(3px)" }}
            />
            {!imgLoaded && <div className="skeleton absolute inset-0 rounded" />}
            <Image
              src={activeDesignUrl}
              alt=""
              width={500}
              height={500}
              className={`relative z-10 h-full w-full object-contain rounded-sm transition-opacity duration-200 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImgLoaded(true)}
              priority
              unoptimized
            />
            <div
              className="absolute inset-0 z-20 rounded-sm pointer-events-none"
              style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.13) 0%,transparent 55%,rgba(0,0,0,0.08) 100%)" }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
