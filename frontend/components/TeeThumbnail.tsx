import Image from "next/image";

// Shared t-shirt SVG path (same as TeePreview)
const TEE_PATH =
  "M 150 60 " +
  "C 128 58 104 66 78 82 " +
  "C 58 96 34 114 4 130 " +
  "L 4 168 " +
  "C 4 176 8 182 18 184 " +
  "L 58 184 " +
  "C 68 184 76 180 78 170 " +
  "L 84 150 " +
  "C 86 144 92 140 100 142 " +
  "C 96 230 92 310 94 424 " +
  "L 286 424 " +
  "C 288 310 284 230 280 142 " +
  "C 288 140 294 144 296 150 " +
  "L 302 170 " +
  "C 304 180 312 184 322 184 " +
  "L 362 184 " +
  "C 372 182 376 176 376 168 " +
  "L 376 130 " +
  "C 346 114 322 96 302 82 " +
  "C 276 66 252 58 230 60 " +
  "C 218 74 210 88 202 96 " +
  "Q 190 102 178 96 " +
  "C 170 88 162 74 150 60 Z";

const COLLAR_OUTER =
  "M 150 60 C 160 47 180 43 190 43 C 200 43 220 47 230 60 " +
  "C 218 80 210 92 202 96 Q 190 102 178 96 C 170 92 162 80 150 60 Z";

const COLLAR_INNER =
  "M 158 64 C 166 52 180 48 190 48 C 200 48 214 52 222 64 " +
  "C 212 84 206 94 200 96 Q 190 100 180 96 C 174 94 168 84 158 64 Z";

type Props = {
  colorHex: string;
  designUrl: string | null;
  /** extra className for the wrapper */
  className?: string;
};

/**
 * Static, compact t-shirt mockup — no interactivity.
 * Used in product cards and the Shop page.
 */
export function TeeThumbnail({ colorHex, designUrl, className = "" }: Props) {
  return (
    <div className={`relative aspect-[380/460] w-full ${className}`}>
      {/* SVG shirt */}
      <svg viewBox="0 0 380 460" className="h-full w-full" aria-hidden>
        <defs>
          <filter id="thShadow" x="-12%" y="-5%" width="124%" height="124%">
            <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#000" floodOpacity="0.20" />
          </filter>
          <linearGradient id="thSide" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#000" stopOpacity="0.18" />
            <stop offset="12%"  stopColor="#000" stopOpacity="0.04" />
            <stop offset="50%"  stopColor="#fff" stopOpacity="0.06" />
            <stop offset="88%"  stopColor="#000" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="thTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#fff" stopOpacity="0.14" />
            <stop offset="35%"  stopColor="#fff" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.14" />
          </linearGradient>
          <clipPath id="thClip">
            <path d={TEE_PATH} />
          </clipPath>
        </defs>

        {/* shirt body */}
        <g filter="url(#thShadow)">
          <path d={TEE_PATH} fill={colorHex} stroke="rgba(0,0,0,0.09)" strokeWidth="1.5" strokeLinejoin="round" />
        </g>

        {/* fabric shading */}
        <g clipPath="url(#thClip)">
          <rect x="0" y="0" width="380" height="460" fill="url(#thSide)" />
          <rect x="0" y="0" width="380" height="460" fill="url(#thTop)" />
          {/* shoulder seams */}
          <path d="M 100 142 C 90 118 84 98 78 82" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 280 142 C 290 118 296 98 302 82" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" strokeLinecap="round" />
          {/* cuff lines */}
          <path d="M 5 178 L 60 182" fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="2" strokeLinecap="round" />
          <path d="M 320 182 L 375 178" fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="2" strokeLinecap="round" />
          {/* hem */}
          <path d="M 96 420 L 284 420" fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* collar */}
        <path d={COLLAR_OUTER} fill={colorHex} stroke="rgba(0,0,0,0.10)" strokeWidth="2" />
        <path d={COLLAR_INNER} fill="rgba(0,0,0,0.24)" />
        <path
          d="M 160 66 C 168 54 182 50 190 50 C 198 50 212 54 220 66"
          fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round"
        />
      </svg>

      {/* design overlay */}
      {designUrl ? (
        <div
          className="pointer-events-none absolute left-1/2 z-10"
          style={{ top: "40%", width: "28%", aspectRatio: "1/1", transform: "translate(-50%,-50%)" }}
        >
          <div
            className="absolute inset-0 rounded-sm blur-md"
            style={{ background: "rgba(0,0,0,0.16)", transform: "scale(1.08) translateY(2px)" }}
          />
          <Image
            src={designUrl}
            alt=""
            width={300}
            height={300}
            className="relative z-10 h-full w-full object-contain rounded-sm"
            unoptimized
          />
          <div
            className="absolute inset-0 z-20 rounded-sm pointer-events-none"
            style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.10) 0%,transparent 50%,rgba(0,0,0,0.06) 100%)" }}
          />
        </div>
      ) : null}
    </div>
  );
}
