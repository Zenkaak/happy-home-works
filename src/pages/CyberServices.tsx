import { useMemo, useState } from "react";
import {
  Search,
  ShieldCheck,
  ArrowLeft,
  MessageCircle,
  ChevronRight,
  Clock,
  BadgeCheck,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  cyberServiceGroups,
  buildCyberWhatsAppLink,
  CYBER_WHATSAPP,
  type CyberService,
} from "@/data/cyberServices";

const CyberServices = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("all");
  const [pending, setPending] = useState<{ service: CyberService; group: string } | null>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = cyberServiceGroups;
    if (activeGroup !== "all") list = list.filter((g) => g.id === activeGroup);
    if (!q) return list;
    return list
      .map((g) => ({
        ...g,
        services: g.services.filter(
          (s) => s.name.toLowerCase().includes(q) || g.title.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.services.length > 0);
  }, [query, activeGroup]);

  const totalServices = cyberServiceGroups.reduce((n, g) => n + g.services.length, 0);

  const confirmBooking = () => {
    if (!pending) return;
    window.open(buildCyberWhatsAppLink(pending.service, pending.group), "_blank", "noopener");
    setPending(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pb-14 pt-4">
        {/* Hero */}
        <section className="px-4">
          <button
            onClick={() => navigate("/")}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to store
          </button>

          <div className="rounded-2xl border border-royal/25 bg-gradient-to-br from-royal/12 via-card to-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-royal/15 border border-royal/30">
                <ShieldCheck className="w-5 h-5 text-royal" />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-lg font-bold leading-tight">
                  H-TECH Cyber Services
                </h1>
                <p className="text-[11px] text-muted-foreground">
                  Government, academic &amp; digital paperwork — handled for you.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { icon: BadgeCheck, label: "Verified agents", tone: "text-primary" },
                { icon: Clock, label: "Same-day service", tone: "text-warning" },
                { icon: ShieldCheck, label: `${totalServices}+ services`, tone: "text-royal" },
              ].map((f) => (
                <div
                  key={f.label}
                  className="rounded-xl border border-border bg-background/50 px-2 py-2.5 text-center"
                >
                  <f.icon className={`mx-auto mb-1 h-3.5 w-3.5 ${f.tone}`} />
                  <p className="text-[9.5px] font-semibold leading-tight text-muted-foreground">
                    {f.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Search */}
        <section className="px-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a service (e.g. passport, TSC, CV)"
              className="w-full rounded-xl border border-border bg-secondary/50 py-2.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-royal/50"
            />
          </div>
        </section>

        <div className="mt-4 px-4 lg:flex lg:gap-6">
          {/* Sidebar navigation */}
          <aside className="lg:w-60 lg:shrink-0">
            <p className="hidden lg:block mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Categories
            </p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
              {[{ id: "all", title: "All services", emoji: "🗂️", count: totalServices }, ...cyberServiceGroups.map((g) => ({ id: g.id, title: g.title, emoji: g.emoji, count: g.services.length }))].map(
                (g) => {
                  const active = activeGroup === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setActiveGroup(g.id)}
                      className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all lg:w-full ${
                        active
                          ? "border-royal/40 bg-royal/10 text-royal"
                          : "border-border bg-card text-foreground hover:border-royal/25"
                      }`}
                    >
                      <span aria-hidden className="text-sm">{g.emoji}</span>
                      <span className="whitespace-nowrap text-[11px] font-semibold lg:whitespace-normal lg:flex-1">
                        {g.title}
                      </span>
                      <span
                        className={`hidden lg:inline text-[10px] font-bold ${
                          active ? "text-royal" : "text-muted-foreground"
                        }`}
                      >
                        {g.count}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </aside>

          {/* Service list */}
          <div className="mt-5 flex-1 space-y-6 lg:mt-0">
            {groups.map((group) => (
              <section key={group.id}>
                <div className="mb-2.5 flex items-center justify-between">
                  <h2 className="flex items-center gap-1.5 font-display text-[13px] font-bold text-foreground">
                    <span aria-hidden>{group.emoji}</span> {group.title}
                  </h2>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {group.services.length} services
                  </span>
                </div>

                <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                  {group.services.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => setPending({ service: s, group: group.title })}
                      className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-royal/5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold leading-snug text-foreground">
                          {s.name}
                        </p>
                        <p className="mt-0.5 text-[11px] font-bold text-primary">{s.price}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </section>
            ))}

            {groups.length === 0 && (
              <p className="py-10 text-center text-xs text-muted-foreground">
                No service matches "{query}"
              </p>
            )}

            <a
              href={`https://wa.me/${CYBER_WHATSAPP}?text=${encodeURIComponent(
                "Hello H-TECH CYBER, I need help with a service."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-royal/30 bg-royal/10 py-3 text-xs font-bold text-royal"
            >
              <MessageCircle className="h-4 w-4" /> Talk to an agent on WhatsApp
            </a>
          </div>
        </div>
      </main>

      {/* Confirmation modal */}
      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setPending(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-bold">Confirm your booking</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Review the details before we open WhatsApp.
                </p>
              </div>
              <button
                onClick={() => setPending(null)}
                aria-label="Close"
                className="rounded-lg border border-border p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 rounded-xl border border-border bg-secondary/40 p-3.5">
              {[
                { label: "Service", value: pending.service.name },
                { label: "Category", value: pending.group },
                { label: "Price", value: pending.service.price, highlight: true },
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-3">
                  <span className="text-[11px] text-muted-foreground">{row.label}</span>
                  <span
                    className={`max-w-[62%] text-right text-[11.5px] font-bold ${
                      row.highlight ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-3 text-[10.5px] leading-relaxed text-muted-foreground">
              Your request will be pre-filled in WhatsApp so an agent can start immediately.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setPending(null)}
                className="flex-1 rounded-xl border border-border bg-secondary py-2.5 text-xs font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={confirmBooking}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-royal py-2.5 text-xs font-bold text-royal-foreground"
              >
                <MessageCircle className="h-3.5 w-3.5" /> Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default CyberServices;
