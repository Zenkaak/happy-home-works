import { APP_PUBLIC_URL } from "@/lib/siteUrl";
import type { Product } from "@/lib/types";

// Try to shrink the URL via is.gd (no auth, CORS-friendly). Falls back to raw URL.
async function shortenUrl(longUrl: string): Promise<string> {
  try {
    const res = await fetch(
      `https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`,
      { method: "GET" }
    );
    if (!res.ok) return longUrl;
    const text = (await res.text()).trim();
    return text.startsWith("http") ? text : longUrl;
  } catch {
    return longUrl;
  }
}

function buildCampaignText(p: Product, url: string): string {
  const price = `KSH ${p.price.toLocaleString()}`;
  let headline = "";
  switch (p.category) {
    case "data": {
      const net = (p.network ?? "").toString();
      const netName = net ? net.charAt(0).toUpperCase() + net.slice(1) : "";
      headline = `⚡ ${p.name}${netName ? ` (${netName})` : ""} — only ${price}`;
      break;
    }
    case "kplc":
      headline = `💡 KPLC Tokens ${price} — instant delivery to your meter`;
      break;
    case "loans":
      headline = `💸 ${p.name} — unlock up to ${price} in minutes`;
      break;
    default:
      headline = `🔥 ${p.name} — ${price}`;
  }

  return [
    headline,
    "Pay with M-Pesa, delivered in seconds. No expiry.",
    `Grab yours 👉 ${url}`,
    "— DASNET, Kenya's cheapest bundles.",
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
    // user cancelled or share failed — fall through to clipboard
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    if (typeof window !== "undefined") window.prompt("Copy share message", text);
    return "failed";
  }
}
