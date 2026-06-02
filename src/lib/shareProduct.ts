import { APP_PUBLIC_URL } from "@/lib/siteUrl";
import type { Product } from "@/lib/types";

export async function shareProduct(p: Product): Promise<"shared" | "copied" | "failed"> {
  const base = typeof window !== "undefined" ? window.location.origin : APP_PUBLIC_URL;
  const url = `${base}/?product=${p.id}`;
  const text = `${p.name} — KSH ${p.price} on DASNET`;

  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      await (navigator as any).share({ title: p.name, text, url });
      return "shared";
    }
  } catch {
    // user cancelled or share failed — fall through to clipboard
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    if (typeof window !== "undefined") window.prompt("Copy product link", url);
    return "failed";
  }
}
