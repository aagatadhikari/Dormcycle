import { imageUrl } from "@/lib/supabase";
import type { Product } from "@/lib/data";

export const CART_KEY = "dormcycle-cart";

/** Service fee charged on a sale. Shown in full before anyone pays. */
export const FEE_RATE = 0.05;
export const feeOn = (subtotalCents: number) => Math.round(subtotalCents * FEE_RATE);

export type CartItem = {
  id: string;
  title: string;
  price_cents: number;
  seller_id: string;
  image: string | null;
  example?: boolean;
};

/** First photo of a listing, whether it is stored in Supabase or part of the catalog. */
export function firstImage(p: Product): string | null {
  if (p.example) return p.example.image;
  const stored = [...(p.product_images ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => imageUrl(i.storage_path));
  return stored[0] ?? null;
}

export function allImages(p: Product): string[] {
  if (p.example) return [p.example.image];
  return [...(p.product_images ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => imageUrl(i.storage_path));
}

export const cartItemFor = (p: Product): CartItem => ({
  id: p.id,
  title: p.title,
  price_cents: p.price_cents,
  seller_id: p.seller_id,
  image: firstImage(p),
  example: !!p.example,
});

export function readCart(): CartItem[] {
  try {
    const saved = window.localStorage.getItem(CART_KEY);
    return saved ? (JSON.parse(saved) as CartItem[]) : [];
  } catch {
    // A blocked or corrupt store just means an empty cart.
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // Ignore: the cart still works for this page view.
  }
}

/** Adds a listing to the stored cart and returns the new contents. */
export function addToStoredCart(p: Product): CartItem[] {
  const items = readCart();
  const next = items.some((i) => i.id === p.id) ? items : [...items, cartItemFor(p)];
  writeCart(next);
  return next;
}
