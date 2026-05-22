export type DesignCategory =
  | "all"
  | "fitness"
  | "funny"
  | "tech"
  | "kannada"
  | "minimal"
  | "cricket";

export type Design = {
  id: string;
  name: string;
  category: Exclude<DesignCategory, "all">;
  imageUrl: string;
  price: number;
  tag?: "Popular" | "New" | "Trending";
};

function enc(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ── Fitness ──────────────────────────────────────────────────────────────────
function fitImg(line1: string, line2: string, accent = "#22c55e"): string {
  return enc(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">` +
      `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0%" stop-color="#111827"/><stop offset="100%" stop-color="#0a1a0d"/>` +
      `</linearGradient></defs>` +
      `<rect width="480" height="480" fill="url(#bg)"/>` +
      `<polygon points="0,420 0,480 60,480" fill="${accent}" opacity="0.08"/>` +
      `<polygon points="420,0 480,0 480,60" fill="${accent}" opacity="0.08"/>` +
      `<rect x="48" y="190" width="44" height="100" rx="9" fill="${accent}" opacity="0.85"/>` +
      `<rect x="68" y="174" width="22" height="132" rx="5" fill="${accent}"/>` +
      `<rect x="90" y="222" width="300" height="36" rx="8" fill="#1f2937"/>` +
      `<rect x="84" y="216" width="26" height="48" rx="5" fill="${accent}"/>` +
      `<rect x="370" y="216" width="26" height="48" rx="5" fill="${accent}"/>` +
      `<rect x="388" y="190" width="44" height="100" rx="9" fill="${accent}" opacity="0.85"/>` +
      `<rect x="390" y="174" width="22" height="132" rx="5" fill="${accent}"/>` +
      `<rect x="150" y="348" width="180" height="4" rx="2" fill="${accent}" opacity="0.7"/>` +
      `<text x="240" y="406" text-anchor="middle" fill="${accent}" font-family="Impact,Arial Black,sans-serif" font-size="48" font-weight="900">${line1}</text>` +
      `<text x="240" y="450" text-anchor="middle" fill="white" font-family="Impact,Arial Black,sans-serif" font-size="28">${line2}</text>` +
      `<text x="240" y="52" text-anchor="middle" fill="#374151" font-family="Arial,sans-serif" font-size="11" letter-spacing="9">GHARSIP · FITNESS</text>` +
      `</svg>`
  );
}

// ── Tech / terminal ──────────────────────────────────────────────────────────
function techImg(line1: string, line2: string, line3 = ""): string {
  const l3 = line3
    ? `<text x="72" y="238" fill="#fbbf24" font-family="Courier New,Courier,monospace" font-size="15">${line3}</text>`
    : "";
  return enc(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">` +
      `<rect width="480" height="480" fill="#0d0d0d"/>` +
      `<rect x="44" y="84" width="392" height="272" rx="12" fill="#0f172a" stroke="#22d3ee" stroke-width="1.5"/>` +
      `<rect x="44" y="84" width="392" height="30" rx="12" fill="#1e293b"/>` +
      `<rect x="44" y="100" width="392" height="14" fill="#1e293b"/>` +
      `<circle cx="70" cy="99" r="7" fill="#ef4444"/>` +
      `<circle cx="93" cy="99" r="7" fill="#f59e0b"/>` +
      `<circle cx="116" cy="99" r="7" fill="#22c55e"/>` +
      `<text x="70" y="158" fill="#22d3ee" font-family="Courier New,Courier,monospace" font-size="17" opacity="0.6">$ </text>` +
      `<text x="106" y="158" fill="#e2e8f0" font-family="Courier New,Courier,monospace" font-size="17">${line1}</text>` +
      `<text x="70" y="198" fill="#22d3ee" font-family="Courier New,Courier,monospace" font-size="17" opacity="0.6">&gt; </text>` +
      `<text x="106" y="198" fill="#86efac" font-family="Courier New,Courier,monospace" font-size="17">${line2}</text>` +
      l3 +
      `<rect x="70" y="268" width="12" height="22" fill="#22d3ee" opacity="0.85"/>` +
      `<rect x="60" y="384" width="360" height="3" rx="1.5" fill="#22d3ee" opacity="0.35"/>` +
      `<text x="240" y="432" text-anchor="middle" fill="#475569" font-family="Courier New,Courier,monospace" font-size="13">gharsip.in</text>` +
      `</svg>`
  );
}

// ── Funny ────────────────────────────────────────────────────────────────────
function funnyImg(text1: string, text2: string, bgColor = "#fbbf24"): string {
  return enc(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">` +
      `<rect width="480" height="480" fill="${bgColor}"/>` +
      `<rect x="56" y="116" width="368" height="216" rx="22" fill="white"/>` +
      `<polygon points="156,332 134,388 226,332" fill="white"/>` +
      `<text x="240" y="212" text-anchor="middle" fill="#111827" font-family="Impact,Arial Black,sans-serif" font-size="48" font-weight="900">${text1}</text>` +
      `<text x="240" y="276" text-anchor="middle" fill="#111827" font-family="Impact,Arial Black,sans-serif" font-size="36">${text2}</text>` +
      `<circle cx="96" cy="424" r="16" fill="white" opacity="0.35"/>` +
      `<circle cx="140" cy="448" r="10" fill="white" opacity="0.2"/>` +
      `<circle cx="376" cy="54" r="20" fill="white" opacity="0.3"/>` +
      `<circle cx="412" cy="26" r="10" fill="white" opacity="0.2"/>` +
      `</svg>`
  );
}

// ── Minimal: mountain ────────────────────────────────────────────────────────
function mountainImg(): string {
  return enc(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">` +
      `<rect width="480" height="480" fill="#f9fafb"/>` +
      `<line x1="40" y1="420" x2="440" y2="420" stroke="#d1d5db" stroke-width="2"/>` +
      `<polyline points="40,420 148,230 228,310 316,150 440,420" fill="none" stroke="#111827" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>` +
      `<polyline points="292,208 316,150 340,208" fill="none" stroke="#111827" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<polyline points="296,210 316,152 336,210" fill="none" stroke="white" stroke-width="1.5"/>` +
      `<circle cx="100" cy="110" r="3" fill="#111827" opacity="0.45"/>` +
      `<circle cx="164" cy="72" r="2.5" fill="#111827" opacity="0.35"/>` +
      `<circle cx="376" cy="94" r="3" fill="#111827" opacity="0.45"/>` +
      `<circle cx="424" cy="132" r="2" fill="#111827" opacity="0.3"/>` +
      `<text x="240" y="462" text-anchor="middle" fill="#9ca3af" font-family="Georgia,serif" font-size="15" letter-spacing="7">MOUNTAIN</text>` +
      `</svg>`
  );
}

// ── Minimal: wave ────────────────────────────────────────────────────────────
function waveImg(): string {
  return enc(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">` +
      `<rect width="480" height="480" fill="#f0f9ff"/>` +
      `<circle cx="240" cy="140" r="46" fill="none" stroke="#f97316" stroke-width="3"/>` +
      `<line x1="240" y1="76" x2="240" y2="62" stroke="#f97316" stroke-width="2.5" stroke-linecap="round"/>` +
      `<line x1="289" y1="91" x2="299" y2="81" stroke="#f97316" stroke-width="2.5" stroke-linecap="round"/>` +
      `<line x1="304" y1="140" x2="318" y2="140" stroke="#f97316" stroke-width="2.5" stroke-linecap="round"/>` +
      `<line x1="191" y1="91" x2="181" y2="81" stroke="#f97316" stroke-width="2.5" stroke-linecap="round"/>` +
      `<line x1="176" y1="140" x2="162" y2="140" stroke="#f97316" stroke-width="2.5" stroke-linecap="round"/>` +
      `<circle cx="240" cy="140" r="30" fill="#fde68a" opacity="0.7"/>` +
      `<path d="M0 268 Q60 228 120 268 Q180 308 240 268 Q300 228 360 268 Q420 308 480 268" fill="none" stroke="#0ea5e9" stroke-width="3.5"/>` +
      `<path d="M0 308 Q60 268 120 308 Q180 348 240 308 Q300 268 360 308 Q420 348 480 308" fill="none" stroke="#0ea5e9" stroke-width="2.5" opacity="0.6"/>` +
      `<path d="M0 348 Q60 308 120 348 Q180 388 240 348 Q300 308 360 348 Q420 388 480 348" fill="none" stroke="#0ea5e9" stroke-width="2" opacity="0.35"/>` +
      `<text x="240" y="454" text-anchor="middle" fill="#94a3b8" font-family="Georgia,serif" font-size="14" letter-spacing="7">SIMPLE WAVE</text>` +
      `</svg>`
  );
}

// ── Minimal: geometric ───────────────────────────────────────────────────────
function geoImg(): string {
  return enc(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">` +
      `<rect width="480" height="480" fill="#fafafa"/>` +
      `<polygon points="240,70 308,188 172,188" fill="#111827" opacity="0.07"/>` +
      `<polygon points="240,70 308,188 172,188" fill="none" stroke="#111827" stroke-width="2.5"/>` +
      `<polygon points="240,148 340,308 140,308" fill="#111827" opacity="0.05"/>` +
      `<polygon points="240,148 340,308 140,308" fill="none" stroke="#111827" stroke-width="2"/>` +
      `<polygon points="240,230 372,428 108,428" fill="none" stroke="#111827" stroke-width="1.5" opacity="0.6"/>` +
      `<line x1="240" y1="70" x2="240" y2="428" stroke="#111827" stroke-width="1" opacity="0.12"/>` +
      `<line x1="172" y1="188" x2="340" y2="308" stroke="#111827" stroke-width="1" opacity="0.12"/>` +
      `<line x1="308" y1="188" x2="140" y2="308" stroke="#111827" stroke-width="1" opacity="0.12"/>` +
      `<circle cx="240" cy="70" r="5.5" fill="#111827"/>` +
      `</svg>`
  );
}

// ── Minimal: sun ─────────────────────────────────────────────────────────────
function sunImg(): string {
  const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
  const rays = angles
    .map((deg) => {
      const r = (Math.PI * deg) / 180;
      const x1 = (240 + 92 * Math.cos(r)).toFixed(1);
      const y1 = (240 + 92 * Math.sin(r)).toFixed(1);
      const x2 = (240 + 144 * Math.cos(r)).toFixed(1);
      const y2 = (240 + 144 * Math.sin(r)).toFixed(1);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f97316" stroke-width="3.5" stroke-linecap="round"/>`;
    })
    .join("");
  return enc(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">` +
      `<rect width="480" height="480" fill="#fffbeb"/>` +
      rays +
      `<circle cx="240" cy="240" r="80" fill="none" stroke="#f97316" stroke-width="3"/>` +
      `<circle cx="240" cy="240" r="58" fill="#fde68a" opacity="0.9"/>` +
      `<text x="240" y="450" text-anchor="middle" fill="#d97706" font-family="Georgia,serif" font-size="14" letter-spacing="7">SIMPLE SUN</text>` +
      `</svg>`
  );
}

// ── Kannada ──────────────────────────────────────────────────────────────────
function kannadaImg(line1: string, line2: string, script = ""): string {
  const scriptEl = script
    ? `<text x="240" y="310" text-anchor="middle" fill="#4ade80" font-family="Arial,sans-serif" font-size="22" opacity="0.9">${script}</text>`
    : "";
  return enc(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">` +
      `<rect width="480" height="480" fill="#111827"/>` +
      `<rect width="480" height="80" fill="#FF9933" opacity="0.9"/>` +
      `<rect y="400" width="480" height="80" fill="#138808" opacity="0.9"/>` +
      `<ellipse cx="240" cy="240" rx="130" ry="108" fill="none" stroke="#FF9933" stroke-width="2.5" opacity="0.5"/>` +
      `<ellipse cx="240" cy="240" rx="100" ry="82" fill="none" stroke="#138808" stroke-width="2" opacity="0.5"/>` +
      `<text x="240" y="216" text-anchor="middle" fill="#FF9933" font-family="Impact,Arial Black,sans-serif" font-size="42" font-weight="900">${line1}</text>` +
      `<text x="240" y="272" text-anchor="middle" fill="white" font-family="Impact,Arial Black,sans-serif" font-size="26" font-weight="700">${line2}</text>` +
      scriptEl +
      `<text x="240" y="44" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing="3">GHARSIP · NAMMA</text>` +
      `<text x="240" y="444" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="13" letter-spacing="3">KARNATAKA</text>` +
      `</svg>`
  );
}

// ── Cricket ──────────────────────────────────────────────────────────────────
function cricketImg(line1: string, line2: string): string {
  return enc(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">` +
      `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0%" stop-color="#0f1b3d"/><stop offset="100%" stop-color="#1a0f3d"/>` +
      `</linearGradient></defs>` +
      `<rect width="480" height="480" fill="url(#bg)"/>` +
      `<ellipse cx="240" cy="316" rx="200" ry="72" fill="#166534" opacity="0.35"/>` +
      `<ellipse cx="240" cy="316" rx="140" ry="50" fill="#15803d" opacity="0.25"/>` +
      `<rect x="198" y="98" width="50" height="156" rx="10" fill="#d4a853"/>` +
      `<rect x="214" y="254" width="18" height="64" rx="4" fill="#a37a3a"/>` +
      `<circle cx="340" cy="192" r="38" fill="#dc2626"/>` +
      `<path d="M314 176 Q340 188 366 176" fill="none" stroke="#fca5a5" stroke-width="2.5"/>` +
      `<path d="M314 208 Q340 196 366 208" fill="none" stroke="#fca5a5" stroke-width="2.5"/>` +
      `<line x1="216" y1="326" x2="216" y2="376" stroke="#d4a853" stroke-width="4.5" stroke-linecap="round"/>` +
      `<line x1="240" y1="326" x2="240" y2="376" stroke="#d4a853" stroke-width="4.5" stroke-linecap="round"/>` +
      `<line x1="264" y1="326" x2="264" y2="376" stroke="#d4a853" stroke-width="4.5" stroke-linecap="round"/>` +
      `<line x1="206" y1="332" x2="274" y2="332" stroke="#d4a853" stroke-width="3" stroke-linecap="round"/>` +
      `<circle cx="88" cy="88" r="4" fill="#fbbf24"/>` +
      `<circle cx="116" cy="58" r="2.5" fill="#fbbf24"/>` +
      `<circle cx="378" cy="112" r="3.5" fill="#fbbf24"/>` +
      `<text x="240" y="428" text-anchor="middle" fill="#fbbf24" font-family="Impact,Arial Black,sans-serif" font-size="46" font-weight="900">${line1}</text>` +
      `<text x="240" y="466" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="20" letter-spacing="5">${line2}</text>` +
      `</svg>`
  );
}

export const DESIGNS: Design[] = [
  // Fitness
  { id: "fit-1", name: "Beast Mode ON", category: "fitness", tag: "Popular", imageUrl: fitImg("BEAST MODE", "UNLOCKED"), price: 150 },
  { id: "fit-2", name: "No Pain No Gain", category: "fitness", imageUrl: fitImg("NO PAIN", "NO GAIN", "#f97316"), price: 150 },
  { id: "fit-3", name: "Train Hard Stay Humble", category: "fitness", imageUrl: fitImg("TRAIN HARD", "STAY HUMBLE", "#3b82f6"), price: 160 },
  { id: "fit-4", name: "Eat Sleep Gym Repeat", category: "fitness", imageUrl: fitImg("GYM", "REPEAT", "#22c55e"), price: 150 },
  { id: "fit-5", name: "Sweat Now Shine Later", category: "fitness", imageUrl: fitImg("SWEAT NOW", "SHINE LATER", "#a78bfa"), price: 160 },
  { id: "fit-6", name: "Lift Heavy Live Happy", category: "fitness", imageUrl: fitImg("LIFT HEAVY", "LIVE HAPPY", "#fb923c"), price: 150 },
  // Tech + Funny
  { id: "tf-1", name: "404 Sleep Not Found", category: "tech", tag: "Popular", imageUrl: techImg("404 -sleep", "not_found()", "// try again tmrw"), price: 175 },
  { id: "tf-2", name: "Bug Free Code", category: "funny", imageUrl: funnyImg("BUG FREE", "CODE", "#fbbf24"), price: 150 },
  { id: "tf-3", name: "I Run On Coffee", category: "tech", imageUrl: techImg("$ brew install", "coffee --hot", "running on port 80"), price: 150 },
  { id: "tf-4", name: "Born To Code", category: "tech", tag: "New", imageUrl: techImg("git init life", "push --force", "origin/greatness"), price: 165 },
  { id: "tf-5", name: "Ctrl Alt Delete", category: "tech", imageUrl: techImg("^ctrl ^alt", "del stress()", "// reboot()"), price: 155 },
  { id: "tf-6", name: "Loading... Please Wait", category: "funny", imageUrl: funnyImg("LOADING...", "PLEASE WAIT", "#818cf8"), price: 160 },
  // Minimal
  { id: "min-1", name: "Mountain minimal", category: "minimal", tag: "Popular", imageUrl: mountainImg(), price: 175 },
  { id: "min-2", name: "Simple wave", category: "minimal", imageUrl: waveImg(), price: 170 },
  { id: "min-3", name: "Geometric abstract", category: "minimal", imageUrl: geoImg(), price: 180 },
  { id: "min-4", name: "Simple sun", category: "minimal", imageUrl: sunImg(), price: 165 },
  // Kannada
  { id: "kn-1", name: "Bengaluru (ಕನ್ನಡ)", category: "kannada", tag: "Popular", imageUrl: kannadaImg("BENGALURU", "Garden City", "ಬೆಂಗಳೂರು"), price: 190 },
  { id: "kn-2", name: "Namma Karnataka", category: "kannada", imageUrl: kannadaImg("NAMMA", "KARNATAKA", "ಕರ್ನಾಟಕ"), price: 185 },
  { id: "kn-3", name: "Kannada pride", category: "kannada", imageUrl: kannadaImg("KANNADA", "PRIDE", "ಕನ್ನಡ ಕನ್ನಡ"), price: 175 },
  { id: "kn-4", name: "Local culture", category: "kannada", imageUrl: kannadaImg("LOCAL", "CULTURE", "ನಮ್ಮ ಸಂಸ್ಕೃತಿ"), price: 180 },
  // Cricket
  { id: "cr-1", name: "Straight Drive", category: "cricket", tag: "Trending", imageUrl: cricketImg("STRAIGHT", "DRIVE"), price: 160 },
  { id: "cr-2", name: "Game Day", category: "cricket", imageUrl: cricketImg("GAME", "DAY"), price: 155 },
];

export function designById(id: string | null | undefined): Design | null {
  if (!id) return null;
  return DESIGNS.find((d) => d.id === id) ?? null;
}

export const CATEGORY_TABS: { id: DesignCategory; label: string; emoji: string }[] = [
  { id: "all", label: "All", emoji: "🎨" },
  { id: "fitness", label: "Fitness", emoji: "💪" },
  { id: "funny", label: "Funny", emoji: "😂" },
  { id: "tech", label: "Tech", emoji: "💻" },
  { id: "kannada", label: "Kannada", emoji: "🏛️" },
  { id: "minimal", label: "Minimal", emoji: "✦" },
  { id: "cricket", label: "Cricket", emoji: "🏏" },
];
