"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CATALOG, CATEGORIES, CONDITIONS, label, price, type Product } from "@/lib/data";
import { FEE_RATE, addToStoredCart, allImages, feeOn, firstImage, readCart } from "@/lib/cart";

type Seller = { full_name: string | null; campus: string | null; created_at: string | null };

const REASONS = [
  "This isn't allowed on DormCycle",
  "The photos aren't the real item",
  "The price looks like a scam",
  "Someone else's listing was copied",
  "The seller is behaving badly",
  "Something else",
];

const monthYear = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";

const fullDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default function ListingPage({ id }: { id: string }) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(CATALOG.find((p) => p.id === id) ?? null);
  const [loading, setLoading] = useState(!product);
  const [missing, setMissing] = useState(false);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [shown, setShown] = useState(0);
  const [inCart, setInCart] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offer, setOffer] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!cancelled) setUserId(auth.user?.id ?? null);

      const fromCatalog = CATALOG.find((p) => p.id === id);
      if (fromCatalog) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("products")
        .select("*, product_images(storage_path, sort_order)")
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;
      if (!data) {
        setMissing(true);
      } else {
        setProduct(data as Product);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, campus, created_at")
          .eq("id", (data as Product).seller_id)
          .maybeSingle();
        if (!cancelled) setSeller((profile as Seller) ?? null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (!cancelled && product) setInCart(readCart().some((i) => i.id === product.id));
    })();
    return () => {
      cancelled = true;
    };
  }, [product]);

  const related = useMemo(() => {
    if (!product) return [];
    return CATALOG.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4);
  }, [product]);

  if (loading) {
    return <Shell><p className="py-24 text-center text-ink">Loading this listing…</p></Shell>;
  }

  if (!product || missing) {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <h1 className="text-xl font-extrabold text-brand">This listing is gone</h1>
          <p className="mt-2 text-sm text-ink">It may have been sold or taken down by the seller.</p>
          <Link href="/" className="btn btn-primary mt-5 inline-block">Browse other listings</Link>
        </div>
      </Shell>
    );
  }

  const images = allImages(product);
  const mine = !!userId && product.seller_id === userId;
  const sold = product.status === "sold";
  const unattached = !!product.example;
  const fee = feeOn(product.price_cents);

  function add(goToCheckout: boolean) {
    if (!product) return;
    addToStoredCart(product);
    setInCart(true);
    if (goToCheckout) router.push("/?checkout=1");
    else setNote("Added to your cart.");
  }

  async function message(text: string) {
    if (!product) return;
    if (!userId) return router.push("/?login=1");
    setBusy(true);
    const { data: convId, error } = await supabase.rpc("start_conversation", { p_product_id: product.id });
    if (error || !convId) {
      setBusy(false);
      return setNote(error?.message ?? "Could not start the chat.");
    }
    await supabase.from("messages").insert({ conversation_id: convId, sender_id: userId, message_text: text });
    router.push(`/?chat=${convId}`);
  }

  function sendOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    const cents = Math.round(parseFloat(offer) * 100);
    if (!Number.isFinite(cents) || cents < 50) return setNote("Enter an offer of at least $0.50.");
    message(`Hi! Would you take ${price(cents)} for "${product.title}"? It's listed at ${price(product.price_cents)}.`);
  }

  const sellerName = seller?.full_name || (unattached ? "DormCycle" : "A DormCycle member");

  return (
    <Shell>
      <nav className="mb-5 flex items-center gap-2 text-sm text-ink">
        <Link href="/" className="hover:text-brand">Listings</Link>
        <span aria-hidden>›</span>
        <Link href={`/?category=${product.category}`} className="hover:text-brand">
          {label(CATEGORIES, product.category)}
        </Link>
        <span aria-hidden>›</span>
        <span className="truncate text-brand">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        {/* Photos */}
        <div className="space-y-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface ring-1 ring-slate-200">
            {images[shown] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[shown]} alt={product.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink">No photo yet</div>
            )}
            {sold && (
              <div className="absolute inset-0 flex items-center justify-center bg-brand/60 text-2xl font-extrabold tracking-wide text-white">
                SOLD
              </div>
            )}
            {product.price_cents === 0 && !sold && (
              <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow">
                Free
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-3">
              {images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setShown(i)}
                  className={`h-20 w-20 overflow-hidden rounded-xl ring-2 transition ${
                    i === shown ? "ring-accent" : "ring-transparent hover:ring-slate-300"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <section className="card p-6">
            <h2 className="text-base font-bold text-brand">About this item</h2>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed text-ink">{product.description}</p>

            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-100 pt-5 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink">Condition</dt>
                <dd className="font-semibold text-brand">{label(CONDITIONS, product.condition)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink">Category</dt>
                <dd className="font-semibold text-brand">{label(CATEGORIES, product.category)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink">Campus</dt>
                <dd className="font-semibold text-brand">{product.campus}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink">Pickup</dt>
                <dd className="font-semibold text-brand">{product.pickup_location || "Arranged in chat"}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-ink">Listed {fullDate(product.created_at)}</p>
          </section>
        </div>

        {/* Buy panel */}
        <div className="space-y-4 lg:sticky lg:top-24">
          <div className="card p-6">
            <h1 className="text-2xl font-extrabold leading-tight text-brand">{product.title}</h1>
            <p className="mt-2 text-3xl font-extrabold text-brand">{price(product.price_cents)}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink">
              <span className="rounded-full bg-mist px-2.5 py-0.5 font-semibold text-brand">
                {label(CONDITIONS, product.condition)}
              </span>
              <span>· {product.pickup_location || product.campus}</span>
            </p>

            {product.price_cents > 0 && (
              <dl className="mt-5 space-y-1.5 rounded-xl bg-surface p-4 text-sm">
                <div className="flex justify-between text-ink">
                  <dt>Item price</dt>
                  <dd>{price(product.price_cents)}</dd>
                </div>
                <div className="flex justify-between text-ink">
                  <dt>Service fee ({Math.round(FEE_RATE * 100)}%)</dt>
                  <dd>{price(fee)}</dd>
                </div>
                <div className="flex justify-between text-ink">
                  <dt>Campus pickup</dt>
                  <dd>Free</dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-extrabold text-brand">
                  <dt>You pay</dt>
                  <dd>{price(product.price_cents + fee)}</dd>
                </div>
              </dl>
            )}

            {note && <p className="mt-4 rounded-md bg-mist p-2.5 text-sm text-brand">{note}</p>}

            {mine ? (
              <p className="mt-5 rounded-md bg-mist p-3 text-sm text-brand">
                This is your listing. Manage it from your Sell page.
              </p>
            ) : sold ? (
              <p className="mt-5 rounded-md bg-surface p-3 text-sm text-ink">
                This one is sold. Browse the board for something similar.
              </p>
            ) : (
              <div className="mt-5 space-y-2">
                <button onClick={() => add(true)} className="btn btn-primary w-full py-3 text-base">
                  Buy now
                </button>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button onClick={() => add(false)} disabled={inCart} className="btn btn-outline">
                    {inCart ? "In your cart" : "Add to cart"}
                  </button>
                  <button
                    onClick={() =>
                      unattached
                        ? setNote("Messaging opens once this seller signs in. You can still buy it now.")
                        : message(
                            product.price_cents === 0
                              ? `Hi! Is "${product.title}" still available? I'd love to take it off your hands.`
                              : `Hi! Is "${product.title}" still available?`,
                          )
                    }
                    disabled={busy}
                    className="btn btn-outline"
                  >
                    Message seller
                  </button>
                </div>

                {!offerOpen ? (
                  <button onClick={() => setOfferOpen(true)} className="btn btn-outline w-full">
                    Make an offer
                  </button>
                ) : (
                  <form onSubmit={sendOffer} className="flex gap-2">
                    <input
                      value={offer}
                      onChange={(e) => setOffer(e.target.value)}
                      inputMode="decimal"
                      placeholder="Your price"
                      className="input"
                    />
                    <button disabled={busy} className="btn btn-accent shrink-0">Send</button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Seller */}
          <div className="card p-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink">Seller</h2>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">
                {sellerName.trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-brand">{sellerName}</p>
                <p className="text-sm text-ink">
                  {seller?.campus || product.campus}
                  {seller?.created_at ? ` · member since ${monthYear(seller.created_at)}` : ""}
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5 text-sm text-ink">
              <li>Meets on campus for handoffs</li>
              <li>Pays nothing until you both agree</li>
            </ul>
          </div>

          <button
            onClick={() => setReportOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-ink transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 9v4m0 3h.01M10.3 4l-8 14h19.4l-8-14a2 2 0 00-3.4 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Report this listing
          </button>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-lg font-bold text-brand">More in {label(CATEGORIES, product.category)}</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((p) => (
              <Link key={p.id} href={`/listing/${p.id}`} className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="aspect-square overflow-hidden bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={firstImage(p) ?? ""} alt={p.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                </div>
                <div className="space-y-0.5 p-3">
                  <p className="font-bold text-brand">{price(p.price_cents)}</p>
                  <p className="truncate text-sm">{p.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {reportOpen && (
        <ReportDialog
          product={product}
          userId={userId}
          onClose={() => setReportOpen(false)}
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/brand/logo.png" alt="" width={30} height={30} />
            <span className="text-lg font-extrabold text-brand">
              Dorm<span className="text-accent">Cycle</span>
            </span>
          </Link>
          <Link href="/" className="ml-auto text-sm font-semibold text-accent hover:text-brand">
            ← All listings
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

function ReportDialog({
  product,
  userId,
  onClose,
}: {
  product: Product;
  userId: string | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return setError("Log in on the marketplace first — reports are tied to your account.");
    setBusy(true);
    setError("");
    const { error: err } = await supabase.from("listing_reports").insert({
      reporter_id: userId,
      listing_ref: product.id,
      listing_title: product.title,
      reason,
      details: details.trim() || null,
    });
    setBusy(false);
    if (err) return setError("Could not send the report. Please try again.");
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <>
            <h2 className="text-lg font-extrabold text-brand">Report sent</h2>
            <p className="mt-2 text-sm text-ink">
              Thanks for flagging it. A moderator reviews reports before taking anything down.
            </p>
            <button onClick={onClose} className="btn btn-primary mt-5 w-full">Close</button>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-brand">Report this listing</h2>
              <p className="text-sm text-ink">{product.title}</p>
            </div>

            <div className="space-y-1.5">
              {REASONS.map((r) => (
                <label key={r} className="flex items-start gap-2 text-sm">
                  <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="mt-1" />
                  <span>{r}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="label" htmlFor="details">Anything else? (optional)</label>
              <textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                maxLength={500}
                className="input"
                placeholder="What should a moderator know?"
              />
            </div>

            {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
              <button disabled={busy} className="btn btn-primary">{busy ? "Sending…" : "Send report"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
