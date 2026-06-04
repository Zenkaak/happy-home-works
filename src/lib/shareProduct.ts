import { APP_PUBLIC_URL } from "@/lib/siteUrl";
import type { Product } from "@/lib/types";

function loanLimitFromName(name: string): string | null {
  // e.g. "Up to 5K Limit" -> "5,000", "Premium 100K Limit" -> "100,000"
  const m = name.match(/(\d+)\s*K/i);
  if (!m) return null;
  return (parseInt(m[1], 10) * 1000).toLocaleString();
}

function buildCampaignText(p: Product, url: string): string {
  const price = `KSH ${p.price.toLocaleString()}`;
  let lines: string[] = [];

  switch (p.category) {
    case "data": {
      const net = (p.network ?? "").toString();
      const netName = net ? net.charAt(0).toUpperCase() + net.slice(1) : "";
      lines = [
        `⚡ ${p.name}${netName ? ` (${netName})` : ""} — only ${price}`,
        "Instant delivery. No expiry. Pay with M-Pesa.",
        `Grab yours 👉 ${url}`,
        "— DASNET, Kenya's cheapest bundles.",
      ];
      break;
    }
    case "kplc":
      lines = [
        `💡 KPLC Tokens worth ${price}`,
        "Delivered to your meter in seconds. Pay via M-Pesa.",
        `Buy now 👉 ${url}`,
        "— DASNET Power, anytime.",
      ];
      break;
    case "loans": {
      const limit = loanLimitFromName(p.name);
      lines = [
        limit
          ? `💸 Upgrade your Fuliza / M-Shwari / KCB limit up to KSH ${limit}`
          : `💸 ${p.name}`,
        `One-time activation fee: ${price}. Approved in minutes.`,
        `Activate now 👉 ${url}`,
        "— DASNET Loans, hassle-free.",
      ];
      break;
    }
    default:
      lines = [
        `🔥 ${p.name} — ${price}`,
        "Pay with M-Pesa, delivered instantly.",
        `Order now 👉 ${url}`,
        "— DASNET, your everyday plug.",
      ];
  }

  return lines.join("\n");
}

export async function shareProduct(p: Product): Promise<"shared" | "copied" | "failed"> {
  const base = typeof window !== "undefined" ? window.location.origin : APP_PUBLIC_URL;
  const url = `${base}/?product=${p.id}`;
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
