export const GHARSIP_UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || "6305468471@upi";

export function buildUpiUri({ amount, note }: { amount: number; note?: string }): string {
  const params = new URLSearchParams({
    pa: GHARSIP_UPI_ID,
    pn: "Gharsip",
    am: amount.toFixed(2),
    cu: "INR",
  });
  if (note) params.set("tn", note);
  return `upi://pay?${params.toString()}`;
}
