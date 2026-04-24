import { ShieldCheck, MessageCircle, Mail, MapPin } from "lucide-react";

const Footer = () => (
  <footer className="mt-6 border-t border-border/60 bg-card/60 backdrop-blur-sm">
    <div className="px-4 py-5 max-w-2xl mx-auto space-y-4">
      {/* Brand row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-primary/30">
            <ShieldCheck className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display font-bold text-sm leading-none">DAS<span className="text-primary">NET</span></p>
            <p className="text-[10px] text-muted-foreground tracking-[0.18em] uppercase mt-1">Dasnet Ventures</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 self-start">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Online</span>
        </span>
      </div>

      {/* Contact links */}
      <div className="grid grid-cols-3 gap-2">
        <a
          href="https://wa.me/254112628799"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 py-2.5 rounded-lg bg-secondary/40 border border-border/40 hover:border-primary/30 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-semibold text-foreground">WhatsApp</span>
        </a>
        <a
          href="mailto:support@dasnet.co.ke"
          className="flex flex-col items-center gap-1 py-2.5 rounded-lg bg-secondary/40 border border-border/40 hover:border-primary/30 transition-colors"
        >
          <Mail className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-semibold text-foreground">Email</span>
        </a>
        <div className="flex flex-col items-center gap-1 py-2.5 rounded-lg bg-secondary/40 border border-border/40">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-semibold text-foreground">Nairobi, KE</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/40 text-[10px] text-muted-foreground">
        <span>© {new Date().getFullYear()} DASNET. All rights reserved.</span>
        <span className="font-medium">Powered by M-Pesa</span>
      </div>
    </div>
  </footer>
);

export default Footer;
