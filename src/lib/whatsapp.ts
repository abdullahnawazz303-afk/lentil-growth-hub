const ADMIN_PHONE = import.meta.env.VITE_ADMIN_WHATSAPP || "923244600645";

interface OrderNotifParams {
  type: "guest" | "customer";
  orderRef: string;
  name: string;
  phone: string;
  items: Array<{ itemName: string; quantity: number }>;
  action?: "placed" | "cancelled";
}

export function notifyAdminWhatsApp({
  type,
  orderRef,
  name,
  phone,
  items,
  action = "placed",
}: OrderNotifParams) {
  const emoji = action === "cancelled" ? "❌" : "🛒";
  const actionText = action === "cancelled" ? "ORDER CANCELLED" : "NEW ORDER";
  const typeLabel = type === "guest" ? "Guest Order" : "Customer Order";

  const itemLines = items
    .map((i) => `  • ${i.itemName} — ${i.quantity} kg`)
    .join("\n");

  const message = [
    `${emoji} *${actionText} — ${typeLabel}*`,
    ``,
    `📋 *Ref:* ${orderRef}`,
    `👤 *Name:* ${name}`,
    `📞 *Phone:* ${phone}`,
    ``,
    `🧺 *Items:*`,
    itemLines,
    ``,
    `— Qais Foods ERP`,
  ].join("\n");

  const url = `https://api.whatsapp.com/send?phone=${ADMIN_PHONE}&text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
