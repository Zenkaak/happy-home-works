// Dynamic Open Graph image as PNG: renders top live products so
// WhatsApp/Twitter/FB previews show actual data bundles + KPLC + Fuliza.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resvg, initWasm } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

let wasmReady: Promise<void> | null = null;
let fontBuf: Uint8Array | null = null;
const ensureReady = async (): Promise<Uint8Array> => {
  if (!wasmReady) {
    wasmReady = fetch("https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm")
      .then((r) => r.arrayBuffer())
      .then((buf) => initWasm(buf));
  }
  await wasmReady;
  if (!fontBuf) {
    const r = await fetch("https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-700-normal.woff");
    if (!r.ok) throw new Error(`font fetch failed: ${r.status}`);
    const ab = await r.arrayBuffer();
    fontBuf = new Uint8Array(ab);
    console.log(`font loaded: ${fontBuf.byteLength} bytes`);
  }
  return fontBuf;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const [dataRes, kplcRes, loansRes] = await Promise.all([
      supabase.from("products").select("name,price,data_amount").eq("category", "data").eq("is_visible", true).order("price", { ascending: true }).limit(4),
      supabase.from("products").select("name,price,units").eq("category", "kplc").eq("is_visible", true).order("price", { ascending: true }).limit(2),
      supabase.from("products").select("name,price").eq("category", "loans").eq("is_visible", true).order("price", { ascending: true }).limit(2),
    ]);

    const dataItems = dataRes.data ?? [];
    const kplcItems = kplcRes.data ?? [];
    const loanItems = loansRes.data ?? [];

    const card = (x: number, y: number, w: number, h: number, badge: string, title: string, price: string, sub?: string) => `
      <g transform="translate(${x}, ${y})">
        <rect width="${w}" height="${h}" rx="14" fill="#0f1729" stroke="#1f2a44" stroke-width="1"/>
        <rect x="14" y="14" width="60" height="22" rx="6" fill="#10b98122"/>
        <text x="22" y="29" font-family="Arial" font-size="11" font-weight="800" fill="#10b981" letter-spacing="1.5">${esc(badge)}</text>
        <text x="14" y="${h - 38}" font-family="Arial" font-size="15" font-weight="700" fill="#ffffff">${esc(title.slice(0, 22))}</text>
        ${sub ? `<text x="14" y="${h - 20}" font-family="Arial" font-size="11" fill="#94a3b8">${esc(sub)}</text>` : ""}
        <text x="${w - 14}" y="${h - 18}" text-anchor="end" font-family="Arial" font-size="20" font-weight="800" fill="#10b981">KSH ${price}</text>
      </g>`;

    let cards = "";
    dataItems.forEach((p: any, i: number) => {
      cards += card(60 + i * 272, 230, 260, 110, "DATA", p.name, p.price, p.data_amount ?? "Bundle");
    });
    kplcItems.forEach((p: any, i: number) => {
      cards += card(60 + i * 272, 360, 260, 110, "KPLC", p.name, p.price, p.units ? `${p.units} units` : "Token");
    });
    loanItems.forEach((p: any, i: number) => {
      cards += card(604 + i * 272, 360, 260, 110, "FULIZA", p.name, p.price, "Airtime loan");
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <radialGradient id="bg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#0d2f24"/>
          <stop offset="100%" stop-color="#0a0e1a"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>
      <text x="60" y="90" font-family="Arial" font-size="56" font-weight="900" fill="#ffffff" letter-spacing="-1">DAS<tspan fill="#10b981">NET</tspan></text>
      <text x="60" y="130" font-family="Arial" font-size="20" fill="#cbd5e1">Cheapest Data, KPLC &amp; Fuliza — Delivered in seconds</text>
      <g transform="translate(60, 165)">
        <rect width="180" height="32" rx="16" fill="#10b98115" stroke="#10b98140"/>
        <circle cx="18" cy="16" r="4" fill="#10b981"/>
        <text x="32" y="21" font-family="Arial" font-size="12" font-weight="700" fill="#10b981" letter-spacing="1.5">LIVE PRICES</text>
      </g>
      ${cards}
      <text x="60" y="560" font-family="Arial" font-size="16" font-weight="700" fill="#94a3b8">Avg delivery 12s   ·   M-Pesa secured   ·   24/7 support</text>
      <text x="60" y="595" font-family="Arial" font-size="14" fill="#64748b">Tap to buy at dasnet — Kenya's #1 trusted data vendor</text>
    </svg>`;

    const font = await ensureReady();
    // Reference Inter as font-family in SVG (defaultFontFamily not in older typings)
    const svgWithFont = svg.replaceAll('font-family="Arial"', 'font-family="Inter"');
    const png = new Resvg(svgWithFont, {
      font: { loadSystemFonts: false, fontBuffers: [font], defaultFontFamily: "Inter" },
    }).render().asPng();

    return new Response(png, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (e: any) {
    return new Response(`error: ${e.message}`, { status: 500, headers: corsHeaders });
  }
});
