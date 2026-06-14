/** Short price suffix for a plan/subscription's billing cycle, e.g. "/week" or "/month". */
export function cycleSuffix(billingCycle?: "weekly" | "monthly"): string {
  return billingCycle === "weekly" ? "/week" : "/month";
}

/** Word form of the billing cycle, e.g. "week" or "month". */
export function cycleWord(billingCycle?: "weekly" | "monthly"): string {
  return billingCycle === "weekly" ? "week" : "month";
}
