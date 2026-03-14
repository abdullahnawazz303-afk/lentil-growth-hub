import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "923065887827";

export function WhatsAppButton() {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=Hello! I'm interested in your lentil products.`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-lg hover:bg-[#1ebe57] transition-all hover:scale-105 group"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
      <span className="hidden group-hover:inline text-sm font-medium">Chat with us</span>
    </a>
  );
}
