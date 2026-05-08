// Per-category business rules (also enforced server-side).
export const CATEGORY_RULES = {
  liquor: { minSubtotal: 1000 },
  cigarettes: { fullPackOnly: true },
};

export const PLATFORM_NAME = "Local Commerce";
