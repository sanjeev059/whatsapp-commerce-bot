import Image from "next/image";

// Same paths as TeePreview — viewBox 460×560
const TEE_PATH =
  "M 155 55 " +
  "C 130 53 108 63 100 88 " +
  "C 76 104 44 124 20 138 " +
  "L 20 178 " +
  "C 20 188 28 196 42 198 " +
  "L 78 198 " +
  "C 92 196 102 188 104 176 " +
  "L 105 155 " +
  "C 103 230 96 370 82 520 " +
  "L 378 520 " +
  "C 364 370 357 230 355 155 " +
  "L 356 176 " +
  "C 358 188 368 196 382 198 " +
  "L 418 198 " +
  "C 432 196 440 188 440 178 " +
  "L 440 138 " +
  "C 416 124 384 104 360 88 " +
  "C 352 63 330 53 305 55 " +
  "C 296 68 284 80 272 86 " +
  "Q 230 94 188 86 " +
  "C 176 80 164 68 155 55 Z";

const COLLAR_OUTER =
  "M 155 55 C 163 40 196 34 230 34 C 264 34 297 40 305 55 " +
  "C 296 68 284 80 272 86 Q 230 94 188 86 C 176 80 164 68 155 55 Z";

const COLLAR_INNER =
  "M 163 59 C 172 46 200 40 230 40 C 260 40 288 46 297 59 " +
  "C 288 72 278 84 272 86 Q 230 94 188 86 C 182 84 172 72 163 59 Z";

type Props = {
  colorHex: string;
  designUrl: string | null;
  className?: string;
};

export function TeeThumbnail({ colorHex, designUrl, className = "" }: Props) {
  const isLight = (() => {
    const h = colorHex.replace("#", "");
    if (h.length !== 6) return false;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 200;
  })();

  const strokeColor = isLight ? "rgba(0,0,0,0.26)" : "rgba(0,0,0,0.09)";

  return (
    <div className={`relative aspect-[460/560] w-full ${className}`}>
      <svg viewBox="0 0 460 560" className="h-full w-full" aria-hidden>
        <defs>
          <filter id="thShadow" x="-14%" y="-6%" width="128%" height="126%">
            <feDropShadow dx="0" dy="8" stdDeviation="11" floodColor="#000" floodOpacity="0.26" />
          </filter>
          <linearGradient id="thSide" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#000" stopOpacity="0.18" />
            <stop offset="10%"  stopColor="#000" stopOpacity="0.04" />
            <stop offset="50%"  stopColor="#fff" stopOpacity="0.06" />
            <stop offset="90%"  stopColor="#000" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="thTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#fff" stopOpacity="0.16" />
            <stop offset="30%"  stopColor="#fff" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.16" />
          </linearGradient>
          <clipPath id="thClip">
            <path d={TEE_PATH} />
          </clipPath>
        </defs>

        <g filter="url(#thShadow)">
          <path d={TEE_PATH} fill={colorHex} stroke={strokeColor}
            strokeWidth={isLight ? "2" : "1.5"} strokeLinejoin="round" />
        </g>

        <g clipPath="url(#thClip)">
          <rect x="0" y="0" width="460" height="560" fill="url(#thSide)" />
          <rect x="0" y="0" width="460" height="560" fill="url(#thTop)" />
          {/* seam lines */}
          <path d="M 105 155 C 102 128 100 106 100 88"
            fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 355 155 C 358 128 360 106 360 88"
            fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 21 193 L 78 195" fill="none" stroke="rgba(0,0,0,0.09)" strokeWidth="2" strokeLinecap="round" />
          <path d="M 382 195 L 439 193" fill="none" stroke="rgba(0,0,0,0.09)" strokeWidth="2" strokeLinecap="round" />
          <path d="M 84 515 L 376 515" fill="none" stroke="rgba(0,0,0,0.09)" strokeWidth="2" strokeLinecap="round" />
        </g>

        <path d={COLLAR_OUTER} fill={colorHex} stroke={strokeColor} strokeWidth={isLight ? "2" : "1.5"} />
        <path d={COLLAR_INNER} fill="rgba(0,0,0,0.26)" />
        <path
          d="M 164 60 C 174 48 202 42 230 42 C 258 42 286 48 296 60"
          fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round"
        />
      </svg>

      {designUrl ? (
        <div
          className="pointer-events-none absolute left-1/2 z-10"
          style={{ top: "40%", width: "26%", aspectRatio: "1/1", transform: "translate(-50%,-50%)" }}
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
            style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.10) 0%,transparent 55%,rgba(0,0,0,0.06) 100%)" }}
          />
        </div>
      ) : null}
    </div>
  );
}
