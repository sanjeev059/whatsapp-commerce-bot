/** Mirrors backend/time_slots.py — 1-hour delivery windows per meal type. */
export const MEAL_TIME_SLOTS: Record<"breakfast" | "lunch" | "dinner", string[]> = {
  breakfast: ["7:00 – 8:00 AM", "8:00 – 9:00 AM"],
  lunch: ["12:00 – 1:00 PM", "1:00 – 2:00 PM"],
  dinner: ["7:00 – 8:00 PM", "8:00 – 9:00 PM"],
};

export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};
