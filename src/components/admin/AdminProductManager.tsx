import { useState } from "react";
import { Edit3, Trash2, Save, Plus, X, Share2, Check } from "lucide-react";
import type { Product } from "@/lib/types";
import { APP_PUBLIC_URL } from "@/lib/siteUrl";

interface AdminProductManagerProps {
  products: Product[] | undefined;
  onUpdateProduct: (p: Partial<Product> & { id: string }) => void;
  onDeleteProduct: (id: string) => void;
  onCreateProduct: (p: Omit<Product, "id" | "created_at" | "updated_at">) => void;
}

const emptyProduct = {
  name: "",
  description: "",
  category: "data" as const,
  network: "safaricom" as const,
  data_amount: "",
  minutes: null,
  price: 0,
  units: null,
  is_visible: true,
  is_promo: false,
  sort_order: 0,
};

const AdminProductManager = ({ products, onUpdateProduct, onDeleteProduct, onCreateProduct }: AdminProductManagerProps) => {
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState(emptyProduct);

  const handleShare = async (p: Product) => {
    const base = typeof window !== "undefined" ? window.location.origin : APP_PUBLIC_URL;
    const url = `${base}/?product=${p.id}`;
    const shareText = `${p.name} — KSH ${p.price}`;
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({ title: p.name, text: shareText, url });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(p.id);
      setTimeout(() => setCopiedId((c) => (c === p.id ? null : c)), 1500);
    } catch {
      window.prompt("Copy product link", url);
    }
  };

  const handleCreate = () => {
    if (!newProduct.name || newProduct.price <= 0) return;
    onCreateProduct({
      ...newProduct,
      network: newProduct.category === "data" ? newProduct.network : null,
      data_amount: newProduct.category === "data" ? newProduct.data_amount : null,
    });
    setNewProduct(emptyProduct);
    setShowCreate(false);
  };

  return (
    <div className="space-y-3">
      {/* Add Product Button */}
      <button
        onClick={() => setShowCreate(!showCreate)}
        className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2"
      >
        {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        {showCreate ? "Cancel" : "Add New Product"}
      </button>

      {/* Create Product Form */}
      {showCreate && (
        <div className="gradient-card rounded-xl p-4 space-y-3 border border-primary/30">
          <h3 className="font-bold text-sm text-primary">New Product</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] text-muted-foreground uppercase font-bold">Name</label>
              <input
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="e.g. 5GB Safaricom"
                className="w-full px-3 py-2 rounded-lg bg-secondary text-sm border border-border"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-bold">Category</label>
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg bg-secondary text-sm border border-border"
              >
                <option value="data">Data</option>
                <option value="kplc">KPLC</option>
                <option value="loans">Loans</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-bold">Price (KES)</label>
              <input
                type="number"
                value={newProduct.price || ""}
                onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-secondary text-sm border border-border"
              />
            </div>
            {newProduct.category === "data" && (
              <>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">Network</label>
                  <select
                    value={newProduct.network || "safaricom"}
                    onChange={(e) => setNewProduct({ ...newProduct, network: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary text-sm border border-border"
                  >
                    <option value="safaricom">Safaricom</option>
                    <option value="airtel">Airtel</option>
                    <option value="telkom">Telkom</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">Data Amount</label>
                  <input
                    value={newProduct.data_amount || ""}
                    onChange={(e) => setNewProduct({ ...newProduct, data_amount: e.target.value })}
                    placeholder="e.g. 5GB"
                    className="w-full px-3 py-2 rounded-lg bg-secondary text-sm border border-border"
                  />
                </div>
              </>
            )}
            <div className="col-span-2">
              <label className="text-[10px] text-muted-foreground uppercase font-bold">Description (optional)</label>
              <input
                value={newProduct.description || ""}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-secondary text-sm border border-border"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={newProduct.is_promo}
                  onChange={(e) => setNewProduct({ ...newProduct, is_promo: e.target.checked })}
                  className="rounded"
                />
                Promo
              </label>
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={!newProduct.name || newProduct.price <= 0}
            className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
          >
            Create Product
          </button>
        </div>
      )}

      {/* Product List */}
      {products?.map((p) => (
        <div key={p.id} className="gradient-card rounded-xl p-4">
          {editProduct?.id === p.id ? (
            <div className="space-y-2">
              <label className="text-[10px] text-muted-foreground uppercase font-bold">Product Name</label>
              <input
                value={editProduct.name}
                onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-secondary text-sm border border-border"
              />
              <label className="text-[10px] text-muted-foreground uppercase font-bold">Price (KES)</label>
              <input
                type="number"
                value={editProduct.price}
                onChange={(e) => setEditProduct({ ...editProduct, price: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-secondary text-sm border border-border"
              />
              <div className="flex gap-2 pt-2">
                <button onClick={() => onUpdateProduct({ id: editProduct.id, name: editProduct.name, price: editProduct.price })} className="flex-1 py-2 rounded-lg gradient-primary text-xs font-bold text-primary-foreground flex items-center justify-center gap-1">
                  <Save className="w-3 h-3" /> Save Changes
                </button>
                <button onClick={() => setEditProduct(null)} className="px-4 py-2 rounded-lg bg-secondary text-xs">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{p.category} {p.network ? `• ${p.network}` : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-primary">KSH {p.price}</span>
                <button
                  onClick={() => handleShare(p)}
                  className="p-2 rounded-lg hover:bg-secondary"
                  title="Copy share link"
                >
                  {copiedId === p.id ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Share2 className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <button onClick={() => setEditProduct(p)} className="p-2 rounded-lg hover:bg-secondary">
                  <Edit3 className="w-4 h-4 text-muted-foreground" />
                </button>
                <button 
                  onClick={() => { if(confirm("Delete product?")) onDeleteProduct(p.id) }} 
                  className="p-2 rounded-lg hover:bg-destructive/20"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminProductManager;
