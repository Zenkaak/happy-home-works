import type { Product } from "@/lib/types";

const formatAmount = (gb: number) => {
  if (gb >= 1) {
    const rounded = Math.round(gb * 100) / 100;
    return `${rounded}GB`;
  }
  return `${Math.round(gb * 1024)}MB`;
};

const parseGb = (raw?: string | null): number | null => {
  if (!raw) return null;
  const gb = raw.match(/([\d.]+)\s*GB/i);
  if (gb) return parseFloat(gb[1]);
  const mb = raw.match(/([\d.]+)\s*MB/i);
  if (mb) return parseFloat(mb[1]) / 1024;
  return null;
};

const parseMinutes = (raw?: string | null): number | null => {
  if (!raw) return null;
  const m = raw.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
};

/**
 * Builds a "half package, half price" win-back offer from a product the user
 * abandoned. Returns null when the package can't be meaningfully halved.
 */
export const buildHalfOffer = (product: Product): Product | null => {
  if (product.category !== "data") return null;

  const price = Math.floor(product.price / 2);
  if (price < 5) return null;

  const gb = parseGb(product.data_amount) ?? parseGb(product.name);
  if (!gb) return null;
  const halfGb = gb / 2;
  const dataLabel = formatAmount(halfGb);

  const mins = parseMinutes(product.minutes);
  const halfMins = mins && mins >= 2 ? Math.floor(mins / 2) : null;

  return {
    ...product,
    id: product.id,
    name: halfMins ? `${dataLabel} + ${halfMins}MINS` : dataLabel,
    description: `Special comeback offer — half the bundle, half the price.`,
    data_amount: dataLabel,
    minutes: halfMins ? `${halfMins}` : null,
    price,
    is_promo: true,
  };
};
