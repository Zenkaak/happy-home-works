// Build a clean M-Pesa AccountReference (max 12 chars) from a transaction/product.
// Examples:
//   data 13GB        -> "13GB DATA"
//   data 13GB + mins -> "13GB DATA"
//   kplc             -> "KPLC TOKEN"
//   loans            -> "LOAN UPGRADE" (truncated to "LOAN UPGRAD")

const MAX_LEN = 12;

function pickDataLabel(name: string): string {
  // Try to extract something like "13GB", "1.5GB", "500MB"
  const m = name.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i);
  if (m) return m[1].replace(/\s+/g, "").toUpperCase();
  return "DATA";
}

export function buildAccountRef(opts: {
  category?: string | null;
  packageName?: string | null;
  dataAmount?: string | null;
}): string {
  const cat = (opts.category || "").toLowerCase();
  const name = opts.packageName || "";
  let ref = "DASNET";

  if (cat === "data") {
    const label = (opts.dataAmount && opts.dataAmount.replace(/\s+/g, "").toUpperCase()) || pickDataLabel(name);
    ref = `${label} DATA`;
  } else if (cat === "kplc") {
    ref = "KPLC TOKEN";
  } else if (cat === "loans" || cat === "loan") {
    ref = "LOAN UPGRADE";
  } else if (name) {
    ref = name.toUpperCase();
  }

  return ref.slice(0, MAX_LEN).trim();
}
