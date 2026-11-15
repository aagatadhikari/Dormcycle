"use client";

import { useEffect, useState } from "react";
import { supabase, imageUrl } from "@/lib/supabase";
import { CAMPUSES, CATEGORIES, CONDITIONS, label, price, type Product } from "@/lib/data";

const MAX_IMAGES = 8;
const MAX_BYTES = 5 * 1024 * 1024;

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand/40 p-4" onClick={onClose}>
      <div className="card my-8 w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md px-2 text-xl text-ink hover:bg-surface">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email")).trim();
    const password = String(fd.get("password"));
    if (mode === "login") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (err) return setError(err.message);
      onClose();
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: String(fd.get("full_name")).trim() }, emailRedirectTo: window.location.origin },
      });
      setBusy(false);
      if (err) return setError(err.message);
      if (data.session) return onClose();
      setNotice("Almost there! Check your email to confirm your account, then come back and log in.");
      setMode("login");
    }
  }

  return (
    <Modal title={mode === "login" ? "Log in to DormCycle" : "Join DormCycle"} onClose={onClose}>
      {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="mb-3 rounded-md bg-mist p-2 text-sm text-brand">{notice}</p>}
      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <div>
            <label className="label" htmlFor="full_name">Name</label>
            <input id="full_name" name="full_name" required maxLength={60} className="input" autoComplete="name" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password{mode === "signup" ? " (8+ characters)" : ""}</label>
          <input id="password" name="password" type="password" required minLength={mode === "signup" ? 8 : 1} className="input" autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </div>
        <button disabled={busy} className="btn btn-primary w-full">{busy ? "One moment…" : mode === "login" ? "Log in" : "Create account"}</button>
      </form>
      <p className="mt-4 text-sm text-ink">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <button className="font-semibold text-accent" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
          {mode === "login" ? "Create an account" : "Log in"}
        </button>
      </p>
    </Modal>
  );
}

export function SellModal({ userId, onClose, onDone }: { userId: string; onClose: () => void; onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function pick(list: FileList | null) {
    setError("");
    const picked = Array.from(list ?? []);
    if (picked.length > MAX_IMAGES) return setError(`Up to ${MAX_IMAGES} photos.`);
    if (picked.some((f) => !f.type.startsWith("image/"))) return setError("Only image files are allowed.");
    if (picked.some((f) => f.size > MAX_BYTES)) return setError("Each photo must be under 5 MB.");
    setFiles(picked);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const cents = Math.round(parseFloat(String(fd.get("price"))) * 100);
    if (!Number.isFinite(cents) || cents < 0) return setError("Enter a valid price.");
    if (cents !== 0 && cents < 50) return setError("Price must be $0 (free) or at least $0.50.");
    if (cents > 1_000_000) return setError("Maximum price is $10,000.");
    if (files.length === 0) return setError("Add at least one photo.");

    setBusy(true);
    const { data: product, error: insErr } = await supabase
      .from("products")
      .insert({
        seller_id: userId,
        title: String(fd.get("title")).trim(),
        description: String(fd.get("description")).trim(),
        price_cents: cents,
        category: String(fd.get("category")),
        condition: String(fd.get("condition")),
        campus: String(fd.get("campus")),
        pickup_location: String(fd.get("pickup_location") ?? "").trim(),
      })
      .select("id")
      .single();
    if (insErr || !product) {
      setBusy(false);
      return setError(insErr?.message ?? "Could not create the listing.");
    }
    const rows: { product_id: string; storage_path: string; sort_order: number }[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${userId}/${product.id}/${i}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, f, { contentType: f.type });
      if (upErr) {
        await supabase.from("products").delete().eq("id", product.id);
        setBusy(false);
        return setError(`Photo upload failed: ${upErr.message}`);
      }
      rows.push({ product_id: product.id, storage_path: path, sort_order: i });
    }
    const { error: imgErr } = await supabase.from("product_images").insert(rows);
    setBusy(false);
    if (imgErr) return setError(imgErr.message);
    onDone();
  }

  return (
    <Modal title="Sell an item" onClose={onClose}>
      {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label" htmlFor="photos">Photos (up to {MAX_IMAGES})</label>
          <input id="photos" type="file" accept="image/*" multiple onChange={(e) => pick(e.target.files)} className="input" />
          {files.length > 0 && <p className="mt-1 text-xs text-ink">{files.length} photo{files.length > 1 ? "s" : ""} selected</p>}
        </div>
        <div>
          <label className="label" htmlFor="title">What are you selling?</label>
          <input id="title" name="title" required maxLength={120} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" required maxLength={5000} rows={3} className="input" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="price">Price (USD)</label>
            <input id="price" name="price" type="number" step="0.01" min="0" required placeholder="0 = free" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select id="category" name="category" className="input">
              {CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="condition">Condition</label>
            <select id="condition" name="condition" className="input">
              {CONDITIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="campus">Campus</label>
            <select id="campus" name="campus" className="input">
              {CAMPUSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pickup_location">Pickup spot</label>
            <input id="pickup_location" name="pickup_location" maxLength={120} placeholder="e.g. Library steps" className="input" />
          </div>
        </div>
        <button disabled={busy} className="btn btn-primary w-full">{busy ? "Publishing…" : "Publish listing"}</button>
      </form>
    </Modal>
  );
}

const joinedLabel = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";

const listedLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function ProductModal({
  product,
  userId,
  onClose,
  onMessage,
  onOffer,
  onChanged,
  onAddToCart,
  inCart,
}: {
  product: Product;
  userId: string | null;
  onClose: () => void;
  onMessage: (p: Product) => Promise<string | void>;
  onOffer: (p: Product, cents: number) => Promise<string | void>;
  onChanged: () => void;
  onAddToCart: (p: Product) => void;
  inCart: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shown, setShown] = useState(0);
  const [seller, setSeller] = useState<{ full_name: string; campus: string | null; created_at: string } | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offer, setOffer] = useState("");

  const images = product.example
    ? [product.example.image]
    : [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((i) => imageUrl(i.storage_path));
  const mine = !!userId && userId === product.seller_id;
  const available = product.status === "active";

  // Who is selling it, for the bio line under the price.
  useEffect(() => {
    if (!product.seller_id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name,campus,created_at")
        .eq("id", product.seller_id)
        .maybeSingle();
      if (!cancelled && data) setSeller(data as { full_name: string; campus: string | null; created_at: string });
    })();
    return () => {
      cancelled = true;
    };
  }, [product.seller_id]);

  async function run(fn: () => Promise<string | void>) {
    setBusy(true);
    setError("");
    const err = await fn();
    setBusy(false);
    if (err) setError(err);
  }

  async function setStatus(status: "active" | "sold") {
    const { error: err } = await supabase.from("products").update({ status }).eq("id", product.id);
    if (err) return err.message;
    onChanged();
  }

  async function remove() {
    if (!window.confirm("Delete this listing? This can't be undone.")) return;
    const paths = (product.product_images ?? []).map((i) => i.storage_path);
    const { error: err } = await supabase.from("products").delete().eq("id", product.id);
    if (err) return err.message;
    if (paths.length) await supabase.storage.from("product-images").remove(paths);
    onChanged();
  }

  function sendOffer(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(offer) * 100);
    if (!Number.isFinite(cents) || cents < 50) return setError("Enter an offer of at least $0.50.");
    if (cents > 1_000_000) return setError("That offer is too high.");
    run(() => onOffer(product, cents));
  }

  const sellerName = seller?.full_name || (product.example ? "DormCycle" : "A student");
  const initial = sellerName.trim().charAt(0).toUpperCase() || "D";

  return (
    <Modal title={product.title} onClose={onClose}>
      <div className="space-y-4">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-surface">
          {images[shown] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[shown]} alt={product.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink">No photo</div>
          )}
          {!available && (
            <div className="absolute inset-0 flex items-center justify-center bg-brand/60 text-2xl font-bold text-white">SOLD</div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2">
            {images.map((src, i) => (
              <button
                key={src}
                onClick={() => setShown(i)}
                className={`h-12 w-12 overflow-hidden rounded-md border-2 ${i === shown ? "border-accent" : "border-transparent"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <p className="text-3xl font-extrabold text-brand">{price(product.price_cents)}</p>

        <div className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
            {initial}
          </span>
          <div className="min-w-0 text-sm">
            <p className="truncate font-semibold text-brand">{sellerName}{mine ? " (you)" : ""}</p>
            <p className="truncate text-xs text-ink">
              {seller?.created_at ? `On DormCycle since ${joinedLabel(seller.created_at)}` : "Student seller"}
              {seller?.campus ? ` · ${seller.campus}` : ""}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink">Category</dt>
            <dd className="font-medium">{label(CATEGORIES, product.category)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink">Condition</dt>
            <dd className="font-medium">{label(CONDITIONS, product.condition)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink">Campus</dt>
            <dd className="font-medium">{product.campus}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink">Pickup</dt>
            <dd className="font-medium">{product.pickup_location || "Arrange in chat"}</dd>
          </div>
        </dl>

        <div>
          <h3 className="font-bold text-brand">About this item</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
            {product.description || "The seller hasn't added a description."}
          </p>
          <p className="mt-2 text-xs text-ink">Listed {listedLabel(product.created_at)}</p>
        </div>

        {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        {product.example ? (
          <div className="space-y-2">
            <p className="rounded-md bg-mist p-3 text-sm text-brand">
              This is an example listing to show how DormCycle works. Real student listings appear at the top of the page.
            </p>
            <button onClick={() => onAddToCart(product)} disabled={inCart} className="btn btn-outline w-full">
              {inCart ? "In your cart" : "Add to cart"}
            </button>
          </div>
        ) : mine ? (
          <div className="flex flex-wrap gap-2">
            {available ? (
              <button disabled={busy} onClick={() => run(() => setStatus("sold"))} className="btn btn-primary">Mark as sold</button>
            ) : (
              <button disabled={busy} onClick={() => run(() => setStatus("active"))} className="btn btn-outline">Relist</button>
            )}
            <button disabled={busy} onClick={() => run(remove)} className="btn border border-red-300 bg-white text-red-700 hover:bg-red-50">
              Delete
            </button>
          </div>
        ) : available ? (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <button onClick={() => onAddToCart(product)} disabled={inCart} className="btn btn-outline">
                {inCart ? "In your cart" : "Add to cart"}
              </button>
              <button disabled={busy} onClick={() => run(() => onMessage(product))} className="btn btn-primary">
                Message seller
              </button>
            </div>

            {product.price_cents > 0 &&
              (offerOpen ? (
                <form onSubmit={sendOffer} className="space-y-2 rounded-lg border border-slate-200 p-3">
                  <label className="label" htmlFor="offer">Your offer (USD)</label>
                  <div className="flex gap-2">
                    <input
                      id="offer"
                      type="number"
                      step="0.01"
                      min="0.5"
                      value={offer}
                      onChange={(e) => setOffer(e.target.value)}
                      className="input"
                      placeholder={(product.price_cents / 100).toFixed(2)}
                      autoFocus
                    />
                    <button disabled={busy} className="btn btn-primary shrink-0">Send offer</button>
                  </div>
                  <p className="text-xs text-ink">
                    Listed at {price(product.price_cents)}. Your offer goes to the seller as a message — they can accept,
                    counter, or decline in the chat.
                  </p>
                </form>
              ) : (
                <button onClick={() => setOfferOpen(true)} className="btn btn-outline w-full">Make an offer</button>
              ))}

            <p className="text-xs text-ink">
              Messaging opens a chat with the seller to set up a campus handoff. Agree on payment between yourselves when
              you meet.
            </p>
          </div>
        ) : (
          <p className="rounded-md bg-surface p-3 text-center text-sm text-ink">This item is no longer available.</p>
        )}
      </div>
    </Modal>
  );
}

const INFO: Record<string, { title: string; body: string[] }> = {
  about: {
    title: "About DormCycle",
    body: [
      "DormCycle is a student-to-student marketplace for dorm essentials, useful finds, and easy campus handoffs.",
      "Every move-out leaves behind fridges, lamps, chairs and textbooks that still have years of use in them. DormCycle keeps them in circulation on campus instead of in a dumpster.",
      "Don't toss it. Keep it going.",
    ],
  },
  how: {
    title: "How DormCycle works",
    body: [
      "1. List it — snap a few photos, set a price, and pick a campus pickup spot. Free items are welcome.",
      "2. Chat — buyers message you in the pop-up chat, so you can agree on a time without swapping phone numbers.",
      "3. Hand it off — meet somewhere public on campus, hand it over, and mark the listing sold.",
    ],
  },
  safety: {
    title: "Campus safety",
    body: [
      "Meet in a public, well-lit spot on campus — a lobby, the library steps, the student union. Never a dorm room.",
      "Bring a friend if you can, and tell someone where you're going.",
      "Keep the conversation in DormCycle chat until you've agreed on a time and place.",
      "Inspect the item before money changes hands, and trust your instincts: if something feels off, walk away and report the listing.",
    ],
  },
  selling: {
    title: "Selling tips",
    body: [
      "Photograph the item in daylight against a plain background, and show any damage honestly.",
      "Price it to move. Most dorm items sell fastest at well under half of what they cost new.",
      "Say where on campus you can meet and roughly when you're free — it saves a dozen messages.",
      "Reply quickly. Buyers usually message several sellers at once.",
    ],
  },
};

export function InfoModal({ topic, onClose }: { topic: string; onClose: () => void }) {
  const content = INFO[topic];
  if (!content) return null;
  return (
    <Modal title={content.title} onClose={onClose}>
      <div className="space-y-3 text-sm leading-relaxed text-ink">
        {content.body.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </Modal>
  );
}

const DONATION_WINDOW = "Donations can only be accepted in the 4 days before the semester ends.";

export function DonateModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function pick(list: FileList | null) {
    setError("");
    const picked = Array.from(list ?? []);
    if (picked.length > MAX_IMAGES) return setError(`Up to ${MAX_IMAGES} photos.`);
    if (picked.some((f) => !f.type.startsWith("image/"))) return setError("Only image files are allowed.");
    if (picked.some((f) => f.size > MAX_BYTES)) return setError("Each photo must be under 5 MB.");
    setFiles(picked);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const address = String(fd.get("address") ?? "").trim();
    const contact = String(fd.get("contact") ?? "").trim();
    if (address.length < 5) return setError("Please enter the pickup address.");
    if (contact.length < 5) return setError("Please enter a phone number or email we can reach you on.");
    if (files.length === 0) return setError("Add at least one photo of the item.");

    setBusy(true);
    const paths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${userId}/donations/${crypto.randomUUID()}-${i}.${ext}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, f, { contentType: f.type });
      if (upErr) {
        setBusy(false);
        return setError(`Photo upload failed: ${upErr.message}`);
      }
      paths.push(path);
    }

    const { error: insErr } = await supabase.from("donations").insert({
      donor_id: userId,
      item_title: String(fd.get("item_title")).trim(),
      description: String(fd.get("description") ?? "").trim(),
      address,
      contact,
      photos: paths,
    });
    setBusy(false);
    if (insErr) return setError(insErr.message);
    setDone(true);
  }

  if (done) {
    return (
      <Modal title="Donation submitted" onClose={onClose}>
        <div className="space-y-4 text-sm text-ink">
          <p className="rounded-md bg-mist p-3 text-brand">
            Thanks! Your donation is logged and DormCycle will contact you to arrange collection.
          </p>
          <p>{DONATION_WINDOW} If the semester isn&apos;t ending yet, we&apos;ll hold your details until the window opens.</p>
          <button onClick={onClose} className="btn btn-primary w-full">Done</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Donate an item" onClose={onClose}>
      <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <b>Please note:</b> {DONATION_WINDOW}
      </p>
      {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label" htmlFor="d-photos">Photos (up to {MAX_IMAGES})</label>
          <input id="d-photos" type="file" accept="image/*" multiple onChange={(e) => pick(e.target.files)} className="input" />
          {files.length > 0 && <p className="mt-1 text-xs text-ink">{files.length} photo{files.length > 1 ? "s" : ""} selected</p>}
        </div>
        <div>
          <label className="label" htmlFor="item_title">What are you donating?</label>
          <input id="item_title" name="item_title" required maxLength={120} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="d-description">Description</label>
          <textarea id="d-description" name="description" rows={3} maxLength={2000} className="input" placeholder="Condition, size, anything a collector should know" />
        </div>
        <div>
          <label className="label" htmlFor="address">Pickup address <span className="text-red-600">*</span></label>
          <input id="address" name="address" required maxLength={300} className="input" placeholder="Hall and room number, or street address" />
        </div>
        <div>
          <label className="label" htmlFor="contact">Contact info <span className="text-red-600">*</span></label>
          <input id="contact" name="contact" required maxLength={160} className="input" placeholder="Phone number or email" />
        </div>
        <p className="text-xs text-ink">
          Your address and contact details stay private — they go only to DormCycle, never onto a public listing.
        </p>
        <button disabled={busy} className="btn btn-primary w-full">{busy ? "Submitting…" : "Submit donation"}</button>
      </form>
    </Modal>
  );
}

type CheckoutLine = { id: string; title: string; price_cents: number; seller_id: string; example?: boolean };

export function CheckoutModal({
  items,
  onClose,
  onPlace,
  onViewMessages,
}: {
  items: CheckoutLine[];
  onClose: () => void;
  onPlace: (note: string) => Promise<{ error?: string; orderIds?: string[] }>;
  onViewMessages: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [orderIds, setOrderIds] = useState<string[] | null>(null);

  const total = items.reduce((sum, i) => sum + i.price_cents, 0);
  const sellers = new Set(items.map((i) => i.seller_id)).size;

  async function place(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await onPlace(note.trim());
    setBusy(false);
    if (result.error) return setError(result.error);
    setOrderIds(result.orderIds ?? []);
  }

  if (orderIds) {
    return (
      <Modal title="Order placed" onClose={onClose}>
        <div className="space-y-4 text-sm">
          <p className="rounded-md bg-mist p-3 text-brand">
            Thanks! {sellers === 1 ? "The seller has" : `All ${sellers} sellers have`} been messaged to arrange your
            campus handoff.
          </p>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink">
              {orderIds.length === 1 ? "Order number" : "Order numbers"}
            </p>
            <p className="font-mono font-semibold text-brand">
              {orderIds.map((id) => `#${id.slice(0, 8).toUpperCase()}`).join("  ")}
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 font-bold text-brand">
            <span>Total due at pickup</span>
            <span>{price(total)}</span>
          </div>
          <p className="text-ink">Bring {price(total)} to the handoff. Nothing has been charged online.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button onClick={onViewMessages} className="btn btn-primary">View messages</button>
            <button onClick={onClose} className="btn btn-outline">Done</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Checkout" onClose={onClose}>
      <form onSubmit={place} className="space-y-4">
        <div className="rounded-lg border border-slate-200">
          {items.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0">
              <span className="min-w-0 truncate">{i.title}</span>
              <span className="shrink-0 font-semibold">{price(i.price_cents)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between bg-surface px-3 py-2 font-bold text-brand">
            <span>Total</span>
            <span>{price(total)}</span>
          </div>
        </div>

        <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-sm font-bold text-brand">Payment</legend>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="pay" defaultChecked className="mt-1" />
            <span>
              <b>Pay at handoff</b>
              <br />
              <span className="text-ink">Cash or whatever you both agree on, when you meet on campus.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm opacity-60">
            <input type="radio" name="pay" disabled className="mt-1" />
            <span>
              <b>Card payment</b> — coming soon
              <br />
              <span className="text-ink">Online card payment isn&apos;t connected yet.</span>
            </span>
          </label>
          <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">
            Demo checkout: no card is charged and no bank account is involved. Placing the order records it and messages
            the seller.
          </p>
        </fieldset>

        <div>
          <label className="label" htmlFor="note">Note for the seller (optional)</label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={300}
            className="input"
            placeholder="When you're free to meet, where on campus suits you…"
          />
        </div>

        {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="btn btn-primary w-full">
          {busy ? "Placing order…" : `Place order · ${price(total)}`}
        </button>
      </form>
    </Modal>
  );
}

type OrderRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  products: { title: string } | { title: string }[] | null;
};

export function OrdersModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [rows, setRows] = useState<OrderRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,buyer_id,seller_id,amount_cents,status,created_at,products(title)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!cancelled) setRows((data ?? []) as OrderRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Modal title="Your orders" onClose={onClose}>
      {rows === null ? (
        <p className="p-4 text-center text-sm text-ink">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="p-4 text-center text-sm text-ink">No orders yet. Add something to your cart and check out.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {rows.map((o) => {
            const prod = Array.isArray(o.products) ? o.products[0] : o.products;
            return (
              <div key={o.id} className="flex items-center gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{prod?.title ?? "Removed listing"}</p>
                  <p className="text-xs text-ink">
                    {o.buyer_id === userId ? "You bought this" : "You sold this"} · #{o.id.slice(0, 8).toUpperCase()} ·{" "}
                    {listedLabel(o.created_at)}
                  </p>
                </div>
                <span className="shrink-0 font-semibold text-brand">{price(o.amount_cents)}</span>
                <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs capitalize">{o.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
