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
 * Realistic crew-neck t-shirt silhouette in a 380×460 viewBox.
 *
 * Key landmark coordinates:
 *   Collar notch left  (150, 60)   Collar notch right  (230, 60)
 *   Collar rib top      (190, 44)
 *   Collar inner bottom (190, 102)
 *   Left shoulder outer  (78, 82)  Right shoulder outer (302, 82)
 *   Left sleeve far out   (4,130)  Right sleeve far out (376,130)
 *   Left cuff bottom     (4,168)   Right cuff bottom   (376,168)
 *   Left underarm       (100,142)  Right underarm      (280,142)
 *   Body left hem        (94,424)  Body right hem      (286,424)
 */

const TEE_PATH =
  "M 150 60 " +
  "C 128 58 104 66 78 82 " +        // left collar → left shoulder
  "C 58 96 34 114 4 130 " +         // shoulder → sleeve outer top
  "L 4 168 " +                       // sleeve outer down
  "C 4 176 8 182 18 184 " +         // cuff outer curve
  "L 58 184 " +                      // across cuff
  "C 68 184 76 180 78 170 " +       // cuff inner curve
  "L 84 150 " +                      // sleeve inner up toward underarm
  "C 86 144 92 140 100 142 " +      // underarm → body transition
  "C 96 230 92 310 94 424 " +       // body left side down (S-curve)
  "L 286 424 " +                     // hem
  "C 288 310 284 230 280 142 " +    // body right side up (S-curve)
  "C 288 140 294 144 296 150 " +    // body → right underarm
  "L 302 170 " +                     // right sleeve inner
  "C 304 180 312 184 322 184 " +    // right cuff inner curve
  "L 362 184 " +                     // across right cuff
  "C 372 182 376 176 376 168 " +    // right cuff outer curve
  "L 376 130 " +                     // right sleeve outer up
  "C 346 114 322 96 302 82 " +      // right sleeve outer → right shoulder
  "C 276 66 252 58 230 60 " +       // right shoulder → right collar
  "C 218 74 210 88 202 96 " +       // right collar curve down
  "Q 190 102 178 96 " +             // collar bottom
  "C 170 88 162 74 150 60 Z";       // left collar curve back

// Collar rib (sits on top of body — same colour, slight border)
const COLLAR_OUTER =
  "M 150 60 " +
  "C 160 47 180 43 190 43 " +
  "C 200 43 220 47 230 60 " +
  "C 218 80 210 92 202 96 " +
  "Q 190 102 178 96 " +
  "C 170 92 162 80 150 60 Z";

// Dark inner fill showing depth inside collar opening
const COLLAR_INNER =
  "M 158 64 " +
  "C 166 52 180 48 190 48 " +
  "C 200 48 214 52 222 64 " +
  "C 212 84 206 94 200 96 " +
  "Q 190 100 180 96 " +
  "C 174 94 168 84 158 64 Z";

export function TeePreview({ colorHex, designUrl, side, zoom }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const scale = zoom ? 1.1 : 1;
  const showFront = side === "front";

  return (
    <div
      className="relative mx-auto w-full max-w-[min(440px,90vw)] select-none rounded-3xl bg-gradient-to-b from-zinc-200 to-zinc-300 p-5 shadow-inner ring-1 ring-black/10"
      data-testid="tee-preview"
    >
      <div
        className="relative mx-auto aspect-[380/460] overflow-visible transition-transform duration-200"
        style={{ transform: `scale(${scale})` }}
      >
        <svg viewBox="0 0 380 460" className="relative z-10 h-full w-full" aria-hidden>
          <defs>
            {/* ── Drop shadow under the whole shirt ── */}
            <filter id="teeShadow" x="-14%" y="-6%" width="128%" height="128%">
              <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000" floodOpacity="0.22" />
            </filter>

            {/* ── Horizontal side-edge darkening (3-D feel) ── */}
            <linearGradient id="sideShade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#000" stopOpacity="0.20" />
              <stop offset="10%"  stopColor="#000" stopOpacity="0.05" />
              <stop offset="50%"  stopColor="#fff" stopOpacity="0.05" />
              <stop offset="90%"  stopColor="#000" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.20" />
            </linearGradient>

            {/* ── Top highlight / bottom shadow ── */}
            <linearGradient id="topShade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#fff" stopOpacity="0.16" />
              <stop offset="30%"  stopColor="#fff" stopOpacity="0.03" />
              <stop offset="70%"  stopColor="#000" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.16" />
            </linearGradient>

            {/* ── Soft chest highlight (oval light from above) ── */}
            <radialGradient id="chestHL" cx="50%" cy="38%" r="36%">
              <stop offset="0%"   stopColor="#fff" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0.00" />
            </radialGradient>

            {/* ── Clip path = shirt silhouette ── */}
            <clipPath id="teeClip">
              <path d={TEE_PATH} />
            </clipPath>
          </defs>

          {/* ── SHIRT BODY ── */}
          <g filter="url(#teeShadow)">
            <path
              d={TEE_PATH}
              fill={colorHex}
              stroke="rgba(0,0,0,0.09)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </g>

          {/* ── FABRIC SHADING (clipped to shirt shape) ── */}
          <g clipPath="url(#teeClip)">
            {/* side + vertical shading */}
            <rect x="0" y="0" width="380" height="460" fill="url(#sideShade)" />
            <rect x="0" y="0" width="380" height="460" fill="url(#topShade)" />
            {/* chest oval highlight */}
            <rect x="0" y="0" width="380" height="460" fill="url(#chestHL)" />

            {/* ── SEAM LINES ── */}
            {/* Left shoulder seam */}
            <path d="M 100 142 C 90 118 84 98 78 82"
              fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="1.5" strokeLinecap="round" />
            {/* Right shoulder seam */}
            <path d="M 280 142 C 290 118 296 98 302 82"
              fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="1.5" strokeLinecap="round" />

            {/* Left body side seam */}
            <path d="M 100 148 C 96 240 92 320 94 424"
              fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" strokeLinecap="round" />
            {/* Right body side seam */}
            <path d="M 280 148 C 284 240 288 320 286 424"
              fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" strokeLinecap="round" />

            {/* Left sleeve underarm seam */}
            <path d="M 84 150 C 52 162 28 168 4 168"
              fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="1" strokeLinecap="round" />
            {/* Right sleeve underarm seam */}
            <path d="M 296 150 C 328 162 352 168 376 168"
              fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="1" strokeLinecap="round" />

            {/* Left cuff hem stitching */}
            <path d="M 5 178 L 60 182"
              fill="none" stroke="rgba(0,0,0,0.11)" strokeWidth="2" strokeLinecap="round" />
            {/* Right cuff hem stitching */}
            <path d="M 320 182 L 375 178"
              fill="none" stroke="rgba(0,0,0,0.11)" strokeWidth="2" strokeLinecap="round" />

            {/* Body hem stitching */}
            <path d="M 96 420 L 284 420"
              fill="none" stroke="rgba(0,0,0,0.11)" strokeWidth="2" strokeLinecap="round" />

            {/* Very subtle center-front crease */}
            <path d="M 190 148 C 188 250 186 340 188 424"
              fill="none" stroke="rgba(0,0,0,0.035)" strokeWidth="7" strokeLinecap="round" />

            {/* Back-view label */}
            {!showFront && (
              <text
                x="190" y="270"
                textAnchor="middle"
                fill="rgba(0,0,0,0.14)"
                fontSize="11"
                fontFamily="sans-serif"
                fontWeight="600"
                letterSpacing="5"
              >
                BACK VIEW
              </text>
            )}
          </g>

          {/* ── COLLAR RIB (same colour as shirt, sits on top) ── */}
          <path
            d={COLLAR_OUTER}
            fill={colorHex}
            stroke="rgba(0,0,0,0.10)"
            strokeWidth="2"
          />
          {/* Collar inner depth (dark shadow inside the tube) */}
          <path
            d={COLLAR_INNER}
            fill="rgba(0,0,0,0.24)"
          />
          {/* Tiny collar inner-edge highlight (fabric thickness) */}
          <path
            d="M 160 66 C 168 54 182 50 190 50 C 198 50 212 54 220 66"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        {/* ── CHEST DESIGN PRINT ── */}
        {showFront && designUrl ? (
          <div
            className="pointer-events-none absolute left-1/2 z-20"
            style={{
              top: "40%",
              width: "27%",
              aspectRatio: "1 / 1",
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Subtle drop-shadow to make the print look embedded in fabric */}
            <div
              className="absolute inset-0 rounded-md blur-md"
              style={{ background: "rgba(0,0,0,0.18)", transform: "scale(1.08) translateY(2px)" }}
            />

            {/* Skeleton while loading */}
            {!imgLoaded && (
              <div className="skeleton absolute inset-0 rounded-md" />
            )}

            {/* The design image */}
            <Image
              src={designUrl}
              alt=""
              width={460}
              height={460}
              className={`relative z-10 h-full w-full object-contain rounded-sm transition-opacity duration-200 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImgLoaded(true)}
              priority
              unoptimized
            />

            {/* Fabric texture/sheen overlay — makes the print look screen-printed */}
            <div
              className="absolute inset-0 z-20 rounded-sm pointer-events-none"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, transparent 50%, rgba(0,0,0,0.06) 100%)",
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
