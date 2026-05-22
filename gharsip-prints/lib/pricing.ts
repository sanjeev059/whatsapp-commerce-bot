export type ProductTypeId = "round" | "vneck" | "oversized" | "polo";

export const PRODUCT_TYPES: Record<
  ProductTypeId,
  { label: string; plainPrice: number; withDesignPrice: number }
> = {
  round: { label: "Round Neck", plainPrice: 249, withDesignPrice: 399 },
  vneck: { label: "V-Neck", plainPrice: 269, withDesignPrice: 419 },
  oversized: { label: "Oversized", plainPrice: 299, withDesignPrice: 449 },
  polo: { label: "Polo", plainPrice: 319, withDesignPrice: 469 },
};

export const DESIGN_DISPLAY_FEE = 150;

/** 12 tee body colours (hex for SVG + swatches) */
export const SHIRT_COLORS: { id: string; label: string; hex: string }[] = [
  { id: "white", label: "White", hex: "#f5f5f5" },
  { id: "black", label: "Black", hex: "#171717" },
  { id: "navy", label: "Navy Blue", hex: "#1e3a5f" },
  { id: "grey", label: "Grey", hex: "#9ca3af" },
  { id: "red", label: "Red", hex: "#b91c1c" },
  { id: "royal", label: "Royal Blue", hex: "#1d4ed8" },
  { id: "green", label: "Green", hex: "#166534" },
  { id: "yellow", label: "Yellow", hex: "#eab308" },
  { id: "maroon", label: "Maroon", hex: "#7f1d1d" },
  { id: "pink", label: "Pink", hex: "#ec4899" },
  { id: "purple", label: "Purple", hex: "#7e22ce" },
  { id: "orange", label: "Orange", hex: "#ea580c" },
];

export const SIZES: {
  id: string;
  label: string;
  chestIn: string;
  lengthIn: string;
}[] = [
  { id: "XS", label: "XS", chestIn: "34", lengthIn: "26" },
  { id: "S", label: "S", chestIn: "36", lengthIn: "27" },
  { id: "M", label: "M", chestIn: "38", lengthIn: "28" },
  { id: "L", label: "L", chestIn: "40", lengthIn: "29" },
  { id: "XL", label: "XL", chestIn: "42", lengthIn: "30" },
  { id: "XXL", label: "XXL", chestIn: "44", lengthIn: "31" },
  { id: "XXXL", label: "XXXL", chestIn: "46", lengthIn: "32" },
];

export const DELIVERY_FLAT = 60;
export const FREE_DELIVERY_OVER = 999;

export function computeLineTotal(
  productType: ProductTypeId,
  hasDesign: boolean,
  qty: number
) {
  const p = PRODUCT_TYPES[productType];
  const unit = hasDesign ? p.withDesignPrice : p.plainPrice;
  return unit * qty;
}

export function computeCartDelivery(subtotal: number) {
  return subtotal >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FLAT;
}
