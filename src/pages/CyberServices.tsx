import { useMemo, useState } from "react";
import { Search, ShieldCheck, ArrowLeft, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  cyberServiceGroups,
  buildCyberWhatsAppLink,
  CYBER_WHATSAPP,
} from "@/data/cyberServices";

const CyberServices = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cyberServiceGroups;
    return cyberServiceGroups
      .map((g) => ({
        ...g,
        services: g.services.filter(
          (s) => s.name.toLowerCase().includes(q) || g.title.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.services.length > 0);
  }, [query]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pb-12 pt-4">
        <section className="px-4">
          <button
            onClick={() => navigate("/")}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                <ShieldCheck className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-base font-bold leading-tight">
                  H-TECH CYBER Services
                </h1>
                <p className="text-[11px] text-muted-foreground">
                  Reliable • Affordable • Professional
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Book any service below and you'll be taken straight to WhatsApp with your
              request pre-filled. Fast • Secure • Nationwide.
            </p>
          </div>
        </section>

        <section className="px-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a service (e.g. passport, TSC, CV)"
              className="w-full rounded-xl border border-border bg-secondary/50 py-2.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
          </div>
        </section>

        <div className="mt-4 space-y-5">
          {groups.map((group) => (
            <section key={group.id} className="px-4">
              <h2 className="mb-2 flex items-center gap-1.5 font-display text-[13px] font-bold text-foreground">
                <span aria-hidden>{group.emoji}</span> {group.title}
              </h2>
              <div className="space-y-2">
                {group.services.map((s) => (
                  <a
                    key={s.name}
                    href={buildCyberWhatsAppLink(s, group.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/40"
                  >
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-foreground leading-snug">
                        {s.name}
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold text-primary">{s.price}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                      <MessageCircle className="w-3 h-3" /> Book
                    </span>
                  </a>
                ))}
              </div>
            </section>
          ))}

          {groups.length === 0 && (
            <p className="px-4 py-10 text-center text-xs text-muted-foreground">
              No service matches "{query}"
            </p>
          )}
        </div>

        <section className="px-4 mt-6">
          <a
            href={`https://wa.me/${CYBER_WHATSAPP}?text=${encodeURIComponent(
              "Hello H-TECH CYBER, I need help with a service."
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 py-3 text-xs font-bold text-primary"
          >
            <MessageCircle className="w-4 h-4" /> Chat with H-TECH CYBER
          </a>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CyberServices;
