export type MenuItem = {
  id: string;
  name: string;
  category: "breakfast" | "rice" | "roti" | "nonveg_curry" | "dairy" | string;
  servingDesc: string;
  energyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  price: number;
};

export type Combo = {
  id: string;
  name: string;
  mealType: "breakfast" | "lunch_dinner" | string;
  dietType: "veg" | "nonveg" | string;
  items: string[];
  energyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  price: number;
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  mealTypes: string[];
  dietType: "veg" | "nonveg" | string;
  billingCycle: "weekly" | "monthly";
  durationDays: number;
  dailyMacros: {
    energyKcal: number;
    proteinG: number;
    carbsG: number;
  };
  priceMonthly: number;
};

export type SubscriptionCustomer = {
  name: string;
  phone: string;
  email: string;
  apartment: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  pincode: string;
  locationUrl?: string;
};

export type DeliveryLogEntry = {
  date: string;
  status: string;
  note?: string;
};

export type Subscription = {
  id: string;
  planId: string;
  planName: string;
  priceMonthly: number;
  billingCycle?: "weekly" | "monthly";
  customer: SubscriptionCustomer;
  phoneDigits: string;
  dietPreference?: string;
  startDate: string;
  mealTimeSlots?: Record<string, string>;
  notes?: string;
  status: "pending_confirmation" | "active" | "paused" | "cancelled" | "completed";
  paymentStatus: "pending" | "paid" | "failed";
  deliveryLog: DeliveryLogEntry[];
  createdAt: string;
};

export type OrderCustomer = {
  name: string;
  phone: string;
  apartment: string;
  address1: string;
  city: string;
  locationUrl?: string;
};

export type OrderLine = {
  kind: "combo" | "item";
  id: string;
  name: string;
  price: number;
  qty: number;
};

export type Order = {
  id: string;
  items: OrderLine[];
  total: number;
  customer: OrderCustomer;
  phoneDigits: string;
  mealType: "breakfast" | "lunch" | "dinner" | string;
  timeSlot: string;
  deliveryDate: string;
  notes?: string;
  status: "placed" | "confirmed" | "delivered" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed";
  createdAt: string;
};
