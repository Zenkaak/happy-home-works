import { Zap, ShieldCheck, Clock } from "lucide-react";

const HeroSection = () => (
  <section className="relative overflow-hidden px-4 pb-4 pt-6">
    <div className="pointer-events-none absolute -top-24 left-1/2 h-[320px] w-[520px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
    <div className="pointer-events-none absolute right-0 top-12 h-[200px] w-[200px] rounded-full bg-accent/10 blur-[90px]" />

    <div className="relative z-10 mx-auto max-w-2xl">
      <div className="mb-3 flex justify-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
            Kenya's #1 Data Vendor
          </span>
        </div>
      </div>

      <h1 className="mb-2 text-center font-display text-2xl font-extrabold leading-[1.1] sm:text-4xl">
        <span className="text-foreground">Cheapest </span>
        <span className="text-gradient">Data, KPLC</span>
        <span className="text-foreground"> &amp; Loans</span>
        <br />
        <span className="text-lg font-bold text-foreground/80 sm:text-2xl">
          Delivered in seconds.
        </span>
      </h1>

      <p className="mx-auto mb-4 max-w-[340px] text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
        No-expiry bundles. Instant M-Pesa STK push. Tokens &amp; airtime delivered before
        you finish typing.
      </p>

      <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
        <Pill icon={Zap} label="Instant" />
        <Pill icon={ShieldCheck} label="Secure M-Pesa" />
        <Pill icon={Clock} label="24/7 Open" />
      </div>
    </div>
  </section>
);

function Pill({ icon: Icon, label }: { icon: typeof Zap; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border/50 bg-secondary/50 p-2 backdrop-blur-sm">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-[9px] font-semibold uppercase tracking-wide text-foreground">
        {label}
      </span>
    </div>
  );
}

export default HeroSection;
