// Application config — change vendor phone here.
// Use international format WITHOUT leading + or spaces (e.g. 916305468471 for +91 63054 68471)
export const VENDOR_PHONE =
  process.env.REACT_APP_VENDOR_PHONE || "916305468471";

export const STORE_NAME = "Local Commerce";
export const STORE_TAGLINE = "Liquor orders above ₹1000 only · Fast doorstep delivery";

// Per-category business rules
export const CATEGORY_RULES = {
  liquor: { minSubtotal: 1000 },
  cigarettes: { fullPackOnly: true },
};
