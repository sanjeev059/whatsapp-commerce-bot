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

// ── FITNESS — proper barbell illustration ─────────────────────────────────
function fitImg(line1: string, line2: string, accent = "#22c55e"): string {
  return enc(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">` +
    `<defs>` +
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="#0f1a0f"/>` +
    `<stop offset="100%" stop-color="#111827"/>` +
    `</linearGradient>` +
    `<linearGradient id="plt" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0%" stop-color="#374151"/>` +
    `<stop offset="40%" stop-color="#4b5563"/>` +
    `<stop offset="100%" stop-color="#374151"/>` +
    `</linearGradient>` +
    `<linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="#6b7280"/>` +
    `<stop offset="50%" stop-color="#9ca3af"/>` +
    `<stop offset="100%" stop-color="#4b5563"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect width="480" height="480" fill="url(#bg)"/>` +
    // corner decorations
    `<polygon points="0,430 0,480 50,480" fill="${accent}" opacity="0.09"/>` +
    `<polygon points="430,0 480,0 480,50" fill="${accent}" opacity="0.09"/>` +
    // subtle lightning bolt
    `<path d="M 400 58 L 380 112 L 408 112 L 388 168 L 446 96 L 418 96 L 436 58 Z" fill="${accent}" opacity="0.09"/>` +
    // barbell drop shadow
    `<ellipse cx="240" cy="344" rx="175" ry="10" fill="${accent}" opacity="0.12"/>` +
    // BAR shaft
    `<rect x="96" y="224" width="288" height="32" rx="7" fill="url(#bar)" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>` +
    // LEFT outer big plate
    `<rect x="40" y="184" width="60" height="112" rx="11" fill="url(#plt)" stroke="rgba(0,0,0,0.4)" stroke-width="1.5"/>` +
    `<rect x="44" y="190" width="52" height="100" rx="8" fill="none" stroke="${accent}" stroke-width="2.5"/>` +
    // LEFT inner plate
    `<rect x="76" y="198" width="24" height="84" rx="6" fill="#374151"/>` +
    `<rect x="77" y="199" width="22" height="82" rx="5" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>` +
    // LEFT collar
    `<rect x="92" y="216" width="20" height="48" rx="5" fill="${accent}"/>` +
    `<rect x="93" y="217" width="18" height="46" rx="4" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>` +
    // weight label on plate
    `<text x="70" y="243" text-anchor="middle" fill="${accent}" font-family="Impact,sans-serif" font-size="13" font-weight="900">20</text>` +
    `<text x="70" y="258" text-anchor="middle" fill="${accent}" font-family="Arial,sans-serif" font-size="8" letter-spacing="1">KG</text>` +
    // RIGHT outer big plate
    `<rect x="380" y="184" width="60" height="112" rx="11" fill="url(#plt)" stroke="rgba(0,0,0,0.4)" stroke-width="1.5"/>` +
    `<rect x="384" y="190" width="52" height="100" rx="8" fill="none" stroke="${accent}" stroke-width="2.5"/>` +
    // RIGHT inner plate
    `<rect x="380" y="198" width="24" height="84" rx="6" fill="#374151"/>` +
    `<rect x="381" y="199" width="22" height="82" rx="5" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>` +
    // RIGHT collar
    `<rect x="368" y="216" width="20" height="48" rx="5" fill="${accent}"/>` +
    `<rect x="369" y="217" width="18" height="46" rx="4" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>` +
    `<text x="410" y="243" text-anchor="middle" fill="${accent}" font-family="Impact,sans-serif" font-size="13" font-weight="900">20</text>` +
    `<text x="410" y="258" text-anchor="middle" fill="${accent}" font-family="Arial,sans-serif" font-size="8" letter-spacing="1">KG</text>` +
    // divider
    `<rect x="150" y="364" width="180" height="3" rx="1.5" fill="${accent}" opacity="0.8"/>` +
    // text
    `<text x="240" y="416" text-anchor="middle" fill="${accent}" font-family="Impact,Arial Black,sans-serif" font-size="50" font-weight="900">${line1}</text>` +
    `<text x="240" y="458" text-anchor="middle" fill="white" font-family="Impact,Arial Black,sans-serif" font-size="27" letter-spacing="2">${line2}</text>` +
    `<text x="240" y="48" text-anchor="middle" fill="#374151" font-family="Arial,sans-serif" font-size="11" letter-spacing="9">GHARSIP ATHLETICS</text>` +
    `</svg>`
  );
}

// ── TECH — realistic terminal window ─────────────────────────────────────
function techImg(line1: string, line2: string, line3 = ""): string {
  const l3el = line3
    ? `<text x="72" y="238" fill="#fbbf24" font-family="Courier New,Courier,monospace" font-size="15">${line3}</text>`
    : "";
  const lineNums =
    `<text x="58" y="158" fill="#4b5563" font-family="Courier New,Courier,monospace" font-size="15">1</text>` +
    `<text x="58" y="198" fill="#4b5563" font-family="Courier New,Courier,monospace" font-size="15">2</text>` +
    (line3 ? `<text x="58" y="238" fill="#4b5563" font-family="Courier New,Courier,monospace" font-size="15">3</text>` : "") +
    `<text x="58" y="278" fill="#4b5563" font-family="Courier New,Courier,monospace" font-size="15">4</text>`;
  return enc(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">` +
    `<rect width="480" height="480" fill="#0a0a0a"/>` +
    // subtle grid bg
    `<path d="M 0 40 L 480 40 M 0 80 L 480 80 M 0 120 L 480 120 M 0 160 L 480 160 M 0 200 L 480 200 M 0 240 L 480 240 M 0 280 L 480 280 M 0 320 L 480 320 M 0 360 L 480 360 M 0 400 L 480 400 M 0 440 L 480 440" stroke="#111" stroke-width="1"/>` +
    // window frame
    `<rect x="40" y="80" width="400" height="288" rx="12" fill="#0f172a" stroke="#22d3ee" stroke-width="1.5"/>` +
    // title bar
    `<rect x="40" y="80" width="400" height="36" rx="12" fill="#1e293b"/>` +
    `<rect x="40" y="98" width="400" height="18" fill="#1e293b"/>` +
    // traffic lights
    `<circle cx="68" cy="98" r="8" fill="#ef4444"/>` +
    `<circle cx="93" cy="98" r="8" fill="#f59e0b"/>` +
    `<circle cx="118" cy="98" r="8" fill="#22c55e"/>` +
    // title text
    `<text x="240" y="103" text-anchor="middle" fill="#64748b" font-family="Courier New,Courier,monospace" font-size="12">gharsip@terminal: ~</text>` +
    // line number gutter separator
    `<line x1="70" y1="120" x2="70" y2="368" stroke="#1e293b" stroke-width="1.5"/>` +
    lineNums +
    // code line 1
    `<text x="72" y="158" fill="#22d3ee" font-family="Courier New,Courier,monospace" font-size="15">$ </text>` +
    `<text x="102" y="158" fill="#e2e8f0" font-family="Courier New,Courier,monospace" font-size="15">${line1}</text>` +
    // code line 2
    `<text x="72" y="198" fill="#22d3ee" font-family="Courier New,Courier,monospace" font-size="15">&gt; </text>` +
    `<text x="102" y="198" fill="#86efac" font-family="Courier New,Courier,monospace" font-size="15">${line2}</text>` +
    // code line 3
    l3el +
    // blinking cursor
    `<text x="72" y="278" fill="#475569" font-family="Courier New,Courier,monospace" font-size="15">$ </text>` +
    `<rect x="102" y="262" width="10" height="18" fill="#22d3ee" rx="1" opacity="0.9"/>` +
    // bottom bar
    `<rect x="40" y="368" width="400" height="3" fill="#22d3ee" opacity="0.18"/>` +
    `<rect x="40" y="416" width="400" height="1.5" rx="0.75" fill="#22d3ee" opacity="0.25"/>` +
    `<text x="240" y="444" text-anchor="middle" fill="#334155" font-family="Courier New,Courier,monospace" font-size="13">gharsip.in — wear your vibe</text>` +
    `</svg>`
  );
}

// ── FUNNY — speech bubble ─────────────────────────────────────────────────
function funnyImg(text1: string, text2: string, bgColor = "#fbbf24"): string {
  return enc(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">` +
    `<rect width="480" height="480" fill="${bgColor}"/>` +
    // decorative dots
    `<circle cx="60" cy="60" r="22" fill="white" opacity="0.3"/>` +
    `<circle cx="420" cy="60" r="16" fill="white" opacity="0.2"/>` +
    `<circle cx="420" cy="420" r="28" fill="white" opacity="0.2"/>` +
    `<circle cx="60" cy="420" r="18" fill="white" opacity="0.25"/>` +
    // speech bubble shadow
    `<rect x="68" y="126" width="362" height="216" rx="22" fill="rgba(0,0,0,0.12)" transform="translate(4,6)"/>` +
    // speech bubble
    `<rect x="56" y="112" width="368" height="216" rx="22" fill="white"/>` +
    `<polygon points="148,328 126,390 228,328" fill="white"/>` +
    // text
    `<text x="240" y="210" text-anchor="middle" fill="#111827" font-family="Impact,Arial Black,sans-serif" font-size="48" font-weight="900">${text1}</text>` +
    `<text x="240" y="278" text-anchor="middle" fill="#111827" font-family="Impact,Arial Black,sans-serif" font-size="36">${text2}</text>` +
    // small circles near tail
    `<circle cx="108" cy="408" r="14" fill="white" opacity="0.5"/>` +
    `<circle cx="148" cy="432" r="9" fill="white" opacity="0.3"/>` +
    `</svg>`
  );
}

// ── MINIMAL: mountain line art ────────────────────────────────────────────
function mountainImg(): string {
  return enc(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">` +
    `<rect width="480" height="480" fill="#f9fafb"/>` +
    // horizon line
    `<line x1="40" y1="424" x2="440" y2="424" stroke="#d1d5db" stroke-width="2"/>` +
    // back mountain (lighter)
    `<polyline points="40,424 200,260 300,340 440,424" fill="none" stroke="#d1d5db" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` +
    // front mountain (main)
    `<polyline points="40,424 148,232 228,312 320,152 440,424" fill="none" stroke="#111827" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>` +
    // snow cap
    `<polyline points="296,210 320,152 344,210" fill="none" stroke="#111827" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    // snow fill hint
    `<polyline points="298,212 320,155 342,212" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>` +
    // stars
    `<circle cx="100" cy="108" r="3" fill="#111827" opacity="0.4"/>` +
    `<circle cx="166" cy="70" r="2.5" fill="#111827" opacity="0.3"/>` +
    `<circle cx="380" cy="92" r="3" fill="#111827" opacity="0.4"/>` +
    `<circle cx="428" cy="136" r="2" fill="#111827" opacity="0.3"/>` +
    `<circle cx="60" cy="188" r="2" fill="#111827" opacity="0.2"/>` +
    `<circle cx="420" cy="204" r="2.5" fill="#111827" opacity="0.25"/>` +
    // label
    `<text x="240" y="462" text-anchor="middle" fill="#9ca3af" font-family="Georgia,serif" font-size="15" letter-spacing="8">MOUNTAIN</text>` +
    `</svg>`
  );
}

// ── MINIMAL: wave + sun ───────────────────────────────────────────────────
function waveImg(): string {
  return enc(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">` +
    `<rect width="480" height="480" fill="#f0f9ff"/>` +
    // sun
    `<circle cx="240" cy="140" r="46" fill="none" stroke="#f97316" stroke-width="3"/>` +
    `<circle cx="240" cy="140" r="30" fill="#fde68a" opacity="0.9"/>` +
    // sun rays
    `<line x1="240" y1="76" x2="240" y2="60" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>` +
    `<line x1="289" y1="91" x2="301" y2="79" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>` +
    `<line x1="304" y1="140" x2="320" y2="140" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>` +
    `<line x1="289" y1="189" x2="301" y2="201" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>` +
    `<line x1="191" y1="91" x2="179" y2="79" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>` +
    `<line x1="176" y1="140" x2="160" y2="140" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>` +
    // waves
    `<path d="M 0 268 Q 60 228 120 268 Q 180 308 240 268 Q 300 228 360 268 Q 420 308 480 268" fill="none" stroke="#0ea5e9" stroke-width="3.5"/>` +
    `<path d="M 0 308 Q 60 268 120 308 Q 180 348 240 308 Q 300 268 360 308 Q 420 348 480 308" fill="none" stroke="#0ea5e9" stroke-width="2.5" opacity="0.65"/>` +
    `<path d="M 0 348 Q 60 308 120 348 Q 180 388 240 348 Q 300 308 360 348 Q 420 388 480 348" fill="none" stroke="#0ea5e9" stroke-width="2" opacity="0.4"/>` +
    `<text x="240" y="454" text-anchor="middle" fill="#94a3b8" font-family="Georgia,serif" font-size="14" letter-spacing="7">SIMPLE WAVE</text>` +
    `</svg>`
  );
}

// ── MINIMAL: geometric ────────────────────────────────────────────────────
function geoImg(): string {
  return enc(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">` +
    `<rect width="480" height="480" fill="#fafafa"/>` +
    `<polygon points="240,68 312,192 168,192" fill="#111827" opacity="0.07"/>` +
    `<polygon points="240,68 312,192 168,192" fill="none" stroke="#111827" stroke-width="2.5"/>` +
    `<polygon points="240,148 344,312 136,312" fill="#111827" opacity="0.05"/>` +
    `<polygon points="240,148 344,312 136,312" fill="none" stroke="#111827" stroke-width="2"/>` +
    `<polygon points="240,232 376,432 104,432" fill="none" stroke="#111827" stroke-width="1.5" opacity="0.6"/>` +
    `<line x1="240" y1="68" x2="240" y2="432" stroke="#111827" stroke-width="1" opacity="0.12"/>` +
    `<line x1="168" y1="192" x2="344" y2="312" stroke="#111827" stroke-width="1" opacity="0.12"/>` +
    `<line x1="312" y1="192" x2="136" y2="312" stroke="#111827" stroke-width="1" opacity="0.12"/>` +
    `<circle cx="240" cy="68" r="6" fill="#111827"/>` +
    `</svg>`
  );
}

// ── MINIMAL: sun ─────────────────────────────────────────────────────────
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

// ── KANNADA — cultural design ─────────────────────────────────────────────
function kannadaImg(line1: string, line2: string, script = ""): string {
  const scriptEl = script
    ? `<text x="240" y="316" text-anchor="middle" fill="#4ade80" font-family="Arial,sans-serif" font-size="22" opacity="0.9">${script}</text>`
    : "";
  return enc(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">` +
    `<rect width="480" height="480" fill="#111827"/>` +
    // top saffron stripe
    `<rect width="480" height="88" fill="#FF9933" opacity="0.92"/>` +
    // bottom green stripe
    `<rect y="392" width="480" height="88" fill="#138808" opacity="0.92"/>` +
    // decorative border frame
    `<rect x="32" y="104" width="416" height="272" rx="6" fill="none" stroke="#FF9933" stroke-width="1.5" opacity="0.4"/>` +
    `<rect x="40" y="112" width="400" height="256" rx="4" fill="none" stroke="#138808" stroke-width="1" opacity="0.4"/>` +
    // oval decoration
    `<ellipse cx="240" cy="240" rx="128" ry="106" fill="none" stroke="#FF9933" stroke-width="2" opacity="0.5"/>` +
    `<ellipse cx="240" cy="240" rx="100" ry="82" fill="none" stroke="#138808" stroke-width="1.5" opacity="0.4"/>` +
    // main text
    `<text x="240" y="218" text-anchor="middle" fill="#FF9933" font-family="Impact,Arial Black,sans-serif" font-size="44" font-weight="900">${line1}</text>` +
    `<text x="240" y="272" text-anchor="middle" fill="white" font-family="Impact,Arial Black,sans-serif" font-size="26" font-weight="700">${line2}</text>` +
    scriptEl +
    `<text x="240" y="48" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing="3">GHARSIP · NAMMA</text>` +
    `<text x="240" y="440" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="14" letter-spacing="3">KARNATAKA</text>` +
    `</svg>`
  );
}

// ── CRICKET — bat + ball illustration ────────────────────────────────────
function cricketImg(line1: string, line2: string): string {
  return enc(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">` +
    `<defs>` +
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="#0f1b3d"/>` +
    `<stop offset="100%" stop-color="#0f0f2d"/>` +
    `</linearGradient>` +
    `<linearGradient id="bat" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0%" stop-color="#b8860b"/>` +
    `<stop offset="50%" stop-color="#daa520"/>` +
    `<stop offset="100%" stop-color="#b8860b"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect width="480" height="480" fill="url(#bg)"/>` +
    // field circle
    `<ellipse cx="240" cy="360" rx="200" ry="72" fill="#166534" opacity="0.35"/>` +
    `<ellipse cx="240" cy="360" rx="140" ry="50" fill="#15803d" opacity="0.25"/>` +
    // pitch strip
    `<rect x="220" y="290" width="40" height="100" rx="3" fill="#d4a853" opacity="0.15"/>` +
    // BAT — blade
    `<rect x="198" y="94" width="54" height="170" rx="10" fill="url(#bat)"/>` +
    // blade ridge (center)
    `<rect x="222" y="98" width="8" height="162" rx="4" fill="#b8860b" opacity="0.6"/>` +
    // BAT — handle
    `<rect x="214" y="264" width="22" height="72" rx="5" fill="#6b3a2a"/>` +
    // grip tape bands
    `<rect x="214" y="272" width="22" height="6" rx="2" fill="#4a2619" opacity="0.8"/>` +
    `<rect x="214" y="284" width="22" height="6" rx="2" fill="#4a2619" opacity="0.8"/>` +
    `<rect x="214" y="296" width="22" height="6" rx="2" fill="#4a2619" opacity="0.8"/>` +
    // handle end
    `<rect x="212" y="332" width="26" height="8" rx="4" fill="#8b4513"/>` +
    // BALL
    `<circle cx="340" cy="188" r="42" fill="#b91c1c"/>` +
    `<circle cx="340" cy="188" r="42" fill="none" stroke="#7f1d1d" stroke-width="2"/>` +
    // ball seam
    `<path d="M 308 174 Q 340 188 372 174" fill="none" stroke="#fca5a5" stroke-width="2.5" stroke-linecap="round"/>` +
    `<path d="M 308 202 Q 340 188 372 202" fill="none" stroke="#fca5a5" stroke-width="2.5" stroke-linecap="round"/>` +
    // ball stitch marks
    `<path d="M 318 170 L 316 176 M 328 168 L 326 174 M 352 168 L 354 174 M 362 170 L 364 176" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round"/>` +
    // STUMPS
    `<line x1="220" y1="328" x2="220" y2="384" stroke="#d4a853" stroke-width="5" stroke-linecap="round"/>` +
    `<line x1="240" y1="328" x2="240" y2="384" stroke="#d4a853" stroke-width="5" stroke-linecap="round"/>` +
    `<line x1="260" y1="328" x2="260" y2="384" stroke="#d4a853" stroke-width="5" stroke-linecap="round"/>` +
    `<line x1="210" y1="334" x2="270" y2="334" stroke="#d4a853" stroke-width="3.5" stroke-linecap="round"/>` +
    // stars
    `<circle cx="88" cy="82" r="4" fill="#fbbf24"/>` +
    `<circle cx="120" cy="56" r="2.5" fill="#fbbf24"/>` +
    `<circle cx="376" cy="108" r="3.5" fill="#fbbf24"/>` +
    `<circle cx="412" cy="72" r="2" fill="#fbbf24"/>` +
    // text
    `<text x="240" y="428" text-anchor="middle" fill="#fbbf24" font-family="Impact,Arial Black,sans-serif" font-size="48" font-weight="900">${line1}</text>` +
    `<text x="240" y="466" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="19" letter-spacing="6">${line2}</text>` +
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
  { id: "tf-1", name: "404 Sleep Not Found", category: "tech", tag: "Popular", imageUrl: techImg("404 -sleep", "not_found()", "// try again tomorrow"), price: 175 },
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
  { id: "all",     label: "All",     emoji: "🎨" },
  { id: "fitness", label: "Fitness", emoji: "💪" },
  { id: "funny",   label: "Funny",   emoji: "😂" },
  { id: "tech",    label: "Tech",    emoji: "💻" },
  { id: "kannada", label: "Kannada", emoji: "🏛️" },
  { id: "minimal", label: "Minimal", emoji: "✦"  },
  { id: "cricket", label: "Cricket", emoji: "🏏" },
];
