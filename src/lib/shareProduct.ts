import { APP_PUBLIC_URL } from "@/lib/siteUrl";
import type { Product } from "@/lib/types";

function loanLimit(name: string): string | null {
  const m = name.match(/(\d+)\s*K/i);
  if (!m) return null;
  return (parseInt(m[1], 10) * 1000).toLocaleString();
}

function netLabel(network?: string | null): string {
  if (!network) return "";
  const n = network.toLowerCase();
  if (n.includes("safari")) return "Safaricom";
  if (n.includes("airtel")) return "Airtel";
  if (n.includes("telkom")) return "Telkom";
  return network.charAt(0).toUpperCase() + network.slice(1);
}

function buildCampaignText(p: Product, url: string): string {
  const price = `Ksh ${p.price.toLocaleString()}`;

  switch (p.category) {
    case "data": {
      const net = netLabel(p.network);
      const size = p.data_amount?.trim();
      const mins = p.minutes?.trim();
      const headline = size && mins
        ? `${size} + ${mins} mins`
        : size || mins || p.name;
      return [
        `📶 Get ${headline}${net ? ` on ${net}` : ""} for just ${price}.`,
        `Delivered instantly to your line the moment you pay with M-Pesa — no agents, no waiting, no hidden charges.`,
        ``,
        `Tap to buy in seconds 👇`,
        url,
        ``,
        `— DASNET • Trusted by thousands across Kenya 🇰🇪`,
      ].join("\n");
    }

    case "kplc": {
      return [
        `💡 Buy KPLC tokens worth ${price} and get them delivered straight to your meter in seconds.`,
        `Safe, instant and 100% reliable — pay with M-Pesa and your token arrives via SMS immediately.`,
        ``,
        `Power up now 👇`,
        url,
        ``,
        `— DASNET • Your trusted KPLC partner.`,
      ].join("\n");
    }

    case "loans": {
      const limit = loanLimit(p.name);
      const limitLine = limit
        ? `Boost your Fuliza, M-Shwari & KCB borrowing limit up to Ksh ${limit}.`
        : `Unlock a higher mobile loan limit today.`;
      return [
        `💸 ${limitLine}`,
        `Quick activation, no paperwork, no CRB stress. Trusted process used by thousands of Kenyans every week.`,
        ``,
        `Activate yours now 👇`,
        url,
        ``,
        `— DASNET Loans • Real limits. Real fast.`,
      ].join("\n");
    }

    default:
      return [
        `🔥 ${p.name} — now available on DASNET for ${price}.`,
        `Pay with M-Pesa and get instant delivery, every time.`,
        ``,
        `Order in seconds 👇`,
        url,
        ``,
        `— DASNET • Kenya's trusted plug.`,
      ].join("\n");
  }
}

function categoryPath(p: Product): string {
  if (p.category === "data") {
    const n = (p.network || "safaricom").toLowerCase();
    return `/data/${n}`;
  }
  if (p.category === "kplc") return "/kplc";
  if (p.category === "loans") return "/fuliza";
  return "/";
}

export async function shareProduct(p: Product): Promise<"shared" | "copied" | "failed"> {
  const base = typeof window !== "undefined" ? window.location.origin : APP_PUBLIC_URL;
  const url = `${base}${categoryPath(p)}?product=${p.id}`;
  const text = buildCampaignText(p, url);

  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      await (navigator as any).share({ title: p.name, text, url });
      return "shared";
    }
  } catch {
    // user cancelled — fall through to clipboard
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    if (typeof window !== "undefined") window.prompt("Copy share message", text);
    return "failed";
  }
}
