import Image from "next/image";

const TEE_PATH =
  "M 160 62 " +
  "C 134 60 114 68 108 86 " +
  "C 82 100 50 116 24 128 " +
  "L 24 170 " +
  "C 24 180 34 188 48 190 " +
  "L 82 188 " +
  "C 96 186 108 178 108 166 " +
  "C 106 290 100 410 90 506 " +
  "L 390 506 " +
  "C 380 410 374 290 372 166 " +
  "C 372 178 384 186 398 188 " +
  "L 432 190 " +
  "C 446 188 456 180 456 170 " +
  "L 456 128 " +
  "C 430 116 398 100 372 86 " +
  "C 366 68 346 60 320 62 " +
  "C 310 74 298 84 288 90 " +
  "Q 240 98 192 90 " +
  "C 182 84 170 74 160 62 Z";

const COLLAR_OUTER =
  "M 160 62 C 168 44 204 36 240 36 C 276 36 312 44 320 62 " +
  "C 310 74 298 84 288 90 Q 240 98 192 90 C 182 84 170 74 160 62 Z";

const COLLAR_INNER =
  "M 170 67 C 180 52 210 45 240 45 C 270 45 300 52 310 67 " +
  "C 300 80 290 88 288 90 Q 240 98 192 90 C 190 88 180 80 170 67 Z";

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
    return (r * 299 + g * 587 + b * 114) / 1000 > 190;
  })();

  const stroke = isLight ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.11)";
  const sw = isLight ? "2" : "1.5";

  return (
    <div className={`relative aspect-[480/560] w-full ${className}`}>
      <svg viewBox="0 0 480 560" className="h-full w-full" aria-hidden>
        <defs>
          <filter id="thShadow" x="-16%" y="-8%" width="132%" height="130%">
            <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#000" floodOpacity="0.28" />
          </filter>
          <linearGradient id="thSide" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#000" stopOpacity="0.20" />
            <stop offset="8%"   stopColor="#000" stopOpacity="0.05" />
            <stop offset="50%"  stopColor="#fff" stopOpacity="0.05" />
            <stop offset="92%"  stopColor="#000" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.20" />
          </linearGradient>
          <linearGradient id="thTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#fff" stopOpacity="0.18" />
            <stop offset="28%"  stopColor="#fff" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
          </linearGradient>
          <clipPath id="thClip"><path d={TEE_PATH} /></clipPath>
        </defs>

        <g filter="url(#thShadow)">
          <path d={TEE_PATH} fill={colorHex} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        </g>
        {/* Sleeve underside */}
        <path
          d="M 24 128 L 24 170 C 48 158 74 144 108 136 L 108 100 C 76 112 48 122 24 128 Z"
          fill="rgba(0,0,0,0.09)" />
        <path
          d="M 456 128 L 456 170 C 432 158 406 144 372 136 L 372 100 C 404 112 432 122 456 128 Z"
          fill="rgba(0,0,0,0.09)" />

        <g clipPath="url(#thClip)">
          <rect x="0" y="0" width="480" height="560" fill="url(#thSide)" />
          <rect x="0" y="0" width="480" height="560" fill="url(#thTop)" />
          <path d="M 160 62 C 134 60 114 68 108 86"
            fill="none" stroke="rgba(0,0,0,0.09)" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M 320 62 C 346 60 366 68 372 86"
            fill="none" stroke="rgba(0,0,0,0.09)" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M 26 185 L 82 184" fill="none" stroke="rgba(0,0,0,0.11)" strokeWidth="2" strokeLinecap="round" />
          <path d="M 398 184 L 454 185" fill="none" stroke="rgba(0,0,0,0.11)" strokeWidth="2" strokeLinecap="round" />
          <path d="M 92 502 L 388 502" fill="none" stroke="rgba(0,0,0,0.11)" strokeWidth="2" strokeLinecap="round" />
        </g>

        <path d={COLLAR_OUTER} fill={colorHex} stroke={stroke} strokeWidth={sw} />
        <path d={COLLAR_INNER} fill="rgba(0,0,0,0.28)" />
        <path
          d="M 170 68 C 182 54 210 47 240 47 C 270 47 298 54 310 68"
          fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="1.5" strokeLinecap="round"
        />
      </svg>

      {designUrl ? (
        <div
          className="pointer-events-none absolute left-1/2 z-10"
          style={{ top: "41%", width: "27%", aspectRatio: "1/1", transform: "translate(-50%,-50%)" }}
        >
          <div
            className="absolute inset-0 rounded blur-md"
            style={{ background: "rgba(0,0,0,0.18)", transform: "scale(1.10) translateY(2px)" }}
          />
          <Image
            src={designUrl} alt="" width={300} height={300}
            className="relative z-10 h-full w-full object-contain rounded-sm"
            unoptimized
          />
        </div>
      ) : null}
    </div>
  );
}
