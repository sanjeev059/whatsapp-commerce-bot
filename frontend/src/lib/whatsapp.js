import { VENDOR_PHONE } from "@/config";

const CAT_EMOJI = {
  liquor: "🍻",
  cigarettes: "🚬",
  snacks: "🍟",
  food: "🍔",
};
const CAT_TITLE = {
  liquor: "Liquor",
  cigarettes: "Cigarettes",
  snacks: "Snacks",
  food: "Food",
};

export function buildOrderMessage({ items, customer, total }) {
  // items: [{ category_id, name, qty, price }]
  const grouped = items.reduce((acc, it) => {
    (acc[it.category_id] = acc[it.category_id] || []).push(it);
    return acc;
  }, {});

  const order = ["liquor", "cigarettes", "snacks", "food"].filter(
    (c) => grouped[c]?.length
  );

  const lines = ["🛒 *New Order*", ""];
  lines.push(`*Customer:* ${customer.name}`);
  lines.push(`*Phone:* ${customer.phone}`);
  lines.push("");

  order.forEach((cat) => {
    lines.push(`${CAT_EMOJI[cat]} *${CAT_TITLE[cat]}*`);
    grouped[cat].forEach((it) => {
      lines.push(`• ${it.name} x${it.qty}`);
    });
    lines.push("");
  });

  lines.push(`💰 *Total:* ₹${total.toLocaleString("en-IN")}`);
  lines.push("");
  lines.push("📍 *Delivery Address:*");
  lines.push(customer.address);
  if (customer.notes && customer.notes.trim()) {
    lines.push("");
    lines.push("📝 *Notes:*");
    lines.push(customer.notes.trim());
  }
  lines.push("");
  lines.push("💵 *Payment Mode:* Cash on Delivery");

  return lines.join("\n");
}

export function buildWhatsAppLink(message, phone = VENDOR_PHONE) {
  const cleaned = String(phone).replace(/[^0-9]/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}
