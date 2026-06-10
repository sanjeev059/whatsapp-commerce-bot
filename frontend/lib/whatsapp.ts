/** WhatsApp number for meal orders & support (E.164, no plus/spaces). */
export const GHARSIP_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || "916305468471";

/** Build a wa.me link with a prefilled message. */
export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${GHARSIP_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
