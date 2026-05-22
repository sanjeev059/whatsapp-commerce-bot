import type { ProductTypeId } from "./pricing";

export type PreviewSide = "front" | "back";

export type CartLine = {
  /** stable client id */
  lineId: string;
  designId: string | null;
  designName: string | null;
  designUrl: string | null;
  productType: ProductTypeId;
  colorId: string;
  colorLabel: string;
  colorHex: string;
  size: string;
  qty: number;
  previewSide: PreviewSide;
  /** unit price captured at add time */
  unitPrice: number;
};

export type StoredOrder = {
  id: string;
  lines: CartLine[];
  customer: {
    name: string;
    phone: string;
    email: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  coupon?: string;
  subtotal: number;
  delivery: number;
  total: number;
  paymentId?: string;
  paymentStatus: "pending" | "paid" | "failed";
  createdAt: string;
  timeline: OrderTimelineStep[];
  tracking?: string;
  qikinkId?: string;
};

export type OrderTimelineStep = {
  key: string;
  label: string;
  done: boolean;
  current?: boolean;
  at?: string;
  detail?: string;
};
