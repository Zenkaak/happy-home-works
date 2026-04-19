import { Zap, ShieldCheck, Clock } from "lucide-react";

const HeroSection = () => (
  <section className="relative overflow-hidden px-4 pt-6 pb-4">
    {/* Ambient glow */}
    <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/15 rounded-full blur-[100px] pointer-events-none" />
    <div className="absolute top-10 right-0 w-[200px] h-[200px] bg-accent/10 rounded-full blur-[80px] pointer-events-none" />

    <div className="relative z-10">
      {/* Trust badge */}
      <div className="flex justify-center mb-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Kenya's #1 Data Vendor</span>
        </div>
      </div>

      {/* Headline */}
      <h1 className="font-display text-2xl sm:text-3xl font-extrabold leading-[1.1] text-center mb-2">
        <span className="text-foreground">Cheapest </span>
        <span className="text-gradient">Data, KPLC</span>
        <span className="text-foreground"> & Loans</span>
        <br />
        <span className="text-foreground/80 text-lg sm:text-xl font-bold">Delivered in seconds.</span>
      </h1>

      {/* Subheading */}
      <p className="text-xs text-muted-foreground text-center max-w-[320px] mx-auto mb-4 leading-relaxed">
        No-expiry bundles. Instant M-Pesa STK push. Tokens & airtime delivered before you finish typing.
      </p>

      {/* Feature pills */}
      <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
        <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-secondary/50 border border-border/50 backdrop-blur-sm">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-[9px] font-semibold text-foreground uppercase tracking-wide">Instant</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-secondary/50 border border-border/50 backdrop-blur-sm">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[9px] font-semibold text-foreground uppercase tracking-wide">Secure M-Pesa</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-secondary/50 border border-border/50 backdrop-blur-sm">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-[9px] font-semibold text-foreground uppercase tracking-wide">24/7 Open</span>
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
