import { MessageCircle } from "lucide-react";

const WhatsAppButton = () => (
  <a
    href="https://wa.me/254112628799"
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[hsl(142,70%,45%)] flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
    aria-label="WhatsApp Support"
  >
    <MessageCircle className="w-7 h-7 text-foreground" />
  </a>
);

export default WhatsAppButton;
