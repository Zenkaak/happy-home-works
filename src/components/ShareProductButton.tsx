import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { shareProduct } from "@/lib/shareProduct";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
  className?: string;
}

const ShareProductButton = ({ product, className = "" }: Props) => {
  const [copied, setCopied] = useState(false);

  const handle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await shareProduct(product);
    if (result === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      aria-label="Share product link"
      title="Share link"
      className={`absolute top-1 right-1 z-10 p-1.5 rounded-md bg-background/70 backdrop-blur-sm border border-border/50 hover:bg-background hover:border-primary/40 transition-colors ${className}`}
    >
      {copied ? (
        <Check className="w-3 h-3 text-primary" />
      ) : (
        <Share2 className="w-3 h-3 text-muted-foreground" />
      )}
    </button>
  );
};

export default ShareProductButton;
