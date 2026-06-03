import { APP_PUBLIC_URL } from "@/lib/siteUrl";
import type { Product } from "@/lib/types";

// Shrink the URL via TinyURL (no auth, CORS-friendly, very reliable).
// Falls back to is.gd, then to the original URL.
async function shortenUrl(longUrl: string): Promise<string> {
  try {
    const res = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`,
    );
    if (res.ok) {
      const text = (await res.text()).trim();
      if (text.startsWith("http")) return text;
    }
  } catch {
    // try next provider
  }
  try {
    const res = await fetch(
      `https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`,
    );
    if (res.ok) {
      const text = (await res.text()).trim();
      if (text.startsWith("http")) return text;
    }
  } catch {
    // fall through
  }
  return longUrl;
}

function isFuliza(p: Product): boolean {
  const hay = `${p.name} ${p.description ?? ""}`.toLowerCase();
  return hay.includes("fuliza");
}

function buildCampaignText(p: Product, url: string): string {
  const price = `KSH ${p.price.toLocaleString()}`;
  let headline = "";
  let pitch = "Pay with M-Pesa, delivered in seconds. No expiry.";

  switch (p.category) {
    case "data": {
      const net = (p.network ?? "").toString();
      const netName = net ? net.charAt(0).toUpperCase() + net.slice(1) : "";
      headline = `⚡ ${p.name}${netName ? ` (${netName})` : ""} — only ${price}`;
      break;
    }
    case "kplc":
      headline = `💡 KPLC Tokens ${price} — instant delivery to your meter`;
      pitch = "Pay with M-Pesa, tokens land on your phone in seconds.";
      break;
    case "loans":
      if (isFuliza(p)) {
        headline = `💰 Are you running short of cash? We have you sorted.`;
        pitch = `Upgrade your Fuliza limit to ${price} — fast, safe and 100% online.`;
      } else {
        headline = `💸 ${p.name} — boost your limit up to ${price}`;
        pitch = "Quick upgrade, instant approval, no paperwork.";
      }
      break;
    default:
      headline = `🔥 ${p.name} — ${price}`;
  }

  return [
    headline,
    pitch,
    `Get it now 👉 ${url}`,
    "— DASNET, Kenya's cheapest deals.",
  ].join("\n");
}

export async function shareProduct(p: Product): Promise<"shared" | "copied" | "failed"> {
  const base = typeof window !== "undefined" ? window.location.origin : APP_PUBLIC_URL;
  const longUrl = `${base}/?product=${p.id}`;
  const url = await shortenUrl(longUrl);
  const text = buildCampaignText(p, url);

  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      await (navigator as any).share({ title: p.name, text, url });
      return "shared";
    }
  } catch {
    // user cancelled or share failed
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    if (typeof window !== "undefined") window.prompt("Copy share message", text);
    return "failed";
  }
}

// --- Section / tab sharing ---------------------------------------------------

export type ShareTab = "data" | "kplc" | "loans";

const TAB_COPY: Record<ShareTab, { title: string; headline: string; pitch: string }> = {
  data: {
    title: "Cheapest Data Bundles in Kenya",
    headline: "📶 Cheapest data bundles in Kenya — all networks",
    pitch: "Safaricom, Airtel & Telkom. Pay with M-Pesa, delivered instantly. No expiry.",
  },
  kplc: {
    title: "KPLC Tokens — instant delivery",
    headline: "💡 Buy KPLC tokens at the best rates",
    pitch: "Pay with M-Pesa, tokens land on your phone within seconds. 24/7.",
  },
  loans: {
    title: "Loan & Fuliza Limit Upgrades",
    headline: "💰 Running short of cash? We have you sorted.",
    pitch: "Upgrade your Fuliza & loan limits fast — safe, online, no paperwork.",
  },
};

export async function shareTab(tab: ShareTab): Promise<"shared" | "copied" | "failed"> {
  const base = typeof window !== "undefined" ? window.location.origin : APP_PUBLIC_URL;
  const longUrl = `${base}/?tab=${tab}`;
  const url = await shortenUrl(longUrl);
  const c = TAB_COPY[tab];
  const text = [
    c.headline,
    c.pitch,
    `Shop here 👉 ${url}`,
    "— DASNET, Kenya's cheapest deals.",
  ].join("\n");

  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      await (navigator as any).share({ title: c.title, text, url });
      return "shared";
    }
  } catch {
    // fall through
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    if (typeof window !== "undefined") window.prompt("Copy share message", text);
    return "failed";
  }
}
