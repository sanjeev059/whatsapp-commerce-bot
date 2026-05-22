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
  /** Placeholder art — swap for Firebase / Storage URLs later */
  imageUrl: string;
  price: number;
};

/** Deterministic placeholder images (no binary assets in repo) */
function img(seed: string, light = false) {
  const bg = light ? "f5f5f5" : "2E7D32";
  const fg = light ? "2E7D32" : "ffffff";
  return `https://placehold.co/480x480/${bg}/${fg}/png?font=popins&text=${encodeURIComponent(seed)}`;
}

export const DESIGNS: Design[] = [
  // Fitness
  { id: "fit-1", name: "Beast Mode ON", category: "fitness", imageUrl: img("Beast+Mode"), price: 150 },
  {
    id: "fit-2",
    name: "No Pain No Gain",
    category: "fitness",
    imageUrl: img("No+Pain"),
    price: 150,
  },
  {
    id: "fit-3",
    name: "Train Hard Stay Humble",
    category: "fitness",
    imageUrl: img("Train+Hard"),
    price: 160,
  },
  {
    id: "fit-4",
    name: "Eat Sleep Gym Repeat",
    category: "fitness",
    imageUrl: img("Gym+Repeat"),
    price: 150,
  },
  {
    id: "fit-5",
    name: "Sweat Now Shine Later",
    category: "fitness",
    imageUrl: img("Sweat+Now"),
    price: 160,
  },
  {
    id: "fit-6",
    name: "Lift Heavy Live Happy",
    category: "fitness",
    imageUrl: img("Lift+Heavy"),
    price: 150,
  },
  // Tech / funny
  { id: "tf-1", name: "404 Sleep Not Found", category: "tech", imageUrl: img("404"), price: 175 },
  {
    id: "tf-2",
    name: "Bug Free Code",
    category: "funny",
    imageUrl: img("Bug+Free"),
    price: 150,
  },
  {
    id: "tf-3",
    name: "I Run On Coffee",
    category: "tech",
    imageUrl: img("Coffee"),
    price: 150,
  },
  {
    id: "tf-4",
    name: "Born To Code",
    category: "tech",
    imageUrl: img("Born+Code"),
    price: 165,
  },
  {
    id: "tf-5",
    name: "Ctrl Alt Delete",
    category: "tech",
    imageUrl: img("Ctrl+Alt"),
    price: 155,
  },
  {
    id: "tf-6",
    name: "Loading... Please Wait",
    category: "funny",
    imageUrl: img("Loading"),
    price: 160,
  },
  // Minimal
  { id: "min-1", name: "Mountain minimal", category: "minimal", imageUrl: img("Mountain", true), price: 175 },
  { id: "min-2", name: "Simple wave", category: "minimal", imageUrl: img("Wave", true), price: 170 },
  { id: "min-3", name: "Geometric abstract", category: "minimal", imageUrl: img("Geo", true), price: 180 },
  { id: "min-4", name: "Simple sun", category: "minimal", imageUrl: img("Sun", true), price: 165 },
  // Kannada
  { id: "kn-1", name: "Bengaluru (ಕನ್ನಡ)", category: "kannada", imageUrl: img("Bengaluru"), price: 190 },
  { id: "kn-2", name: "Namma Karnataka", category: "kannada", imageUrl: img("Namma"), price: 185 },
  {
    id: "kn-3",
    name: "Kannada pride",
    category: "kannada",
    imageUrl: img("Pride"),
    price: 175,
  },
  {
    id: "kn-4",
    name: "Local culture",
    category: "kannada",
    imageUrl: img("Culture"),
    price: 180,
  },
  // Cricket
  { id: "cr-1", name: "Straight Drive", category: "cricket", imageUrl: img("Cricket+1"), price: 160 },
  { id: "cr-2", name: "Game Day", category: "cricket", imageUrl: img("Game+Day"), price: 155 },
];

export function designById(id: string | null | undefined): Design | null {
  if (!id) return null;
  return DESIGNS.find((d) => d.id === id) ?? null;
}

export const CATEGORY_TABS: { id: DesignCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "fitness", label: "Fitness" },
  { id: "funny", label: "Funny" },
  { id: "tech", label: "Tech" },
  { id: "kannada", label: "Kannada" },
  { id: "minimal", label: "Minimal" },
  { id: "cricket", label: "Cricket" },
];
