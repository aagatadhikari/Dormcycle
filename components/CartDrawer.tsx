"use client";

import { price } from "@/lib/data";

export type CartItem = {
  id: string;
  title: string;
  price_cents: number;
  seller_id: string;
  image: string | null;
  example?: boolean;
};

export default function CartDrawer({
  items,
  open,
  setOpen,
  onRemove,
  onCheckout,
  busy,
  note,
}: {
  items: CartItem[];
  open: boolean;
  setOpen: (v: boolean) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  busy: boolean;
  note: string;
}) {
  const total = items.reduce((sum, i) => sum + i.price_cents, 0);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label={items.length ? `Cart, ${items.length} items` : "Cart"}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand shadow-lg ring-1 ring-slate-200 hover:bg-mist"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
          <path d="M2 3h2.2l2.3 12.2a2 2 0 0 0 2 1.6h8.1a2 2 0 0 0 2-1.6L21 7H5.3" />
        </svg>
        {items.length > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-accent px-1.5 text-xs font-bold leading-5 text-white">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-brand/40" onClick={() => setOpen(false)} />
          <aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-xl"
            role="dialog"
            aria-label="Shopping cart"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-lg font-bold text-brand">Your cart</h2>
              <button onClick={() => setOpen(false)} aria-label="Close cart" className="rounded-md px-2 text-xl text-ink hover:bg-surface">×</button>
            </div>

            <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
              {items.length === 0 && (
                <p className="p-6 text-center text-sm text-ink">
                  Your cart is empty. Open any listing and choose <b>Add to cart</b>.
                </p>
              )}
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                    {item.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="text-sm text-brand">{price(item.price_cents)}</p>
                  </div>
                  <button onClick={() => onRemove(item.id)} className="text-xs font-semibold text-ink underline hover:text-red-600">
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-slate-200 p-4">
              {note && <p className="rounded-md bg-mist p-2 text-sm text-brand">{note}</p>}
              <div className="flex items-center justify-between text-base font-bold text-brand">
                <span>Total</span>
                <span>{price(total)}</span>
              </div>
              <button disabled={busy || items.length === 0} onClick={onCheckout} className="btn btn-primary w-full">
                {busy ? "Working…" : "Checkout"}
              </button>
              <p className="text-xs text-ink">
                Checkout messages each seller to arrange a campus handoff. You pay them in person when you meet.
              </p>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
