import { Zap, ShieldCheck, Clock, Sparkles } from "lucide-react";

const HeroSection = () => (
  <section className="relative overflow-hidden px-4 pt-7 pb-5">
    {/* Ambient glows */}
    <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[560px] h-[320px] bg-primary/20 rounded-full blur-[110px] pointer-events-none" />
    <div className="absolute top-8 right-[-40px] w-[220px] h-[220px] bg-accent/10 rounded-full blur-[90px] pointer-events-none" />
    <div className="absolute top-32 left-[-60px] w-[200px] h-[200px] bg-primary/10 rounded-full blur-[90px] pointer-events-none" />

    <div className="relative z-10">
      {/* Trust badge */}
      <div className="flex justify-center mb-3.5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-md shadow-[0_0_24px_-8px_hsl(var(--primary)/0.6)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-[10px] font-bold text-primary tracking-[0.18em] uppercase">Kenya's #1 Data Vendor</span>
          <Sparkles className="w-3 h-3 text-primary" />
        </div>
      </div>

      {/* Headline */}
      <h1 className="font-display text-[26px] sm:text-4xl font-extrabold leading-[1.05] text-center mb-2.5 tracking-tight">
        <span className="text-foreground">Cheapest </span>
        <span className="text-gradient">Data, KPLC</span>
        <span className="text-foreground"> & Loans</span>
        <br />
        <span className="text-foreground/70 text-lg sm:text-2xl font-bold">Delivered in seconds.</span>
      </h1>

      {/* Subheading */}
      <p className="text-[12px] text-muted-foreground text-center max-w-[340px] mx-auto mb-5 leading-relaxed">
        No-expiry bundles. Instant M-Pesa STK push. Tokens & airtime delivered before you finish typing.
      </p>

      {/* Feature pills */}
      <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
        {[
          { icon: Zap, label: "Instant", sub: "<15s" },
          { icon: ShieldCheck, label: "Secure", sub: "M-Pesa" },
          { icon: Clock, label: "24/7", sub: "Always on" },
        ].map(({ icon: Icon, label, sub }) => (
          <div
            key={label}
            className="group relative flex flex-col items-center gap-1 p-2.5 rounded-xl bg-secondary/40 border border-border/60 backdrop-blur-sm hover:border-primary/40 hover:bg-secondary/60 transition-all"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Icon className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-[10px] font-bold text-foreground uppercase tracking-wider leading-none">{label}</span>
            <span className="text-[9px] text-muted-foreground leading-none">{sub}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HeroSection;
