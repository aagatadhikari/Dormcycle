"use client";

import { useState } from "react";
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

export function SellModal({
  userId,
  donate = false,
  onClose,
  onDone,
}: {
  userId: string;
  donate?: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
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
    const cents = donate ? 0 : Math.round(parseFloat(String(fd.get("price"))) * 100);
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
    <Modal title={donate ? "Donate an item" : "Sell an item"} onClose={onClose}>
      {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {donate && (
        <p className="mb-3 rounded-md bg-mist p-3 text-sm text-brand">
          Donations are posted free. Add a photo and a short description, and it shows up under Free items for anyone on
          campus to claim.
        </p>
      )}
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label" htmlFor="photos">Photos (up to {MAX_IMAGES})</label>
          <input id="photos" type="file" accept="image/*" multiple onChange={(e) => pick(e.target.files)} className="input" />
          {files.length > 0 && <p className="mt-1 text-xs text-ink">{files.length} photo{files.length > 1 ? "s" : ""} selected</p>}
        </div>
        <div>
          <label className="label" htmlFor="title">{donate ? "What are you donating?" : "What are you selling?"}</label>
          <input id="title" name="title" required maxLength={120} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" required maxLength={5000} rows={3} className="input" />
        </div>
        <div className={`grid gap-3 ${donate ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          {!donate && (
            <div>
              <label className="label" htmlFor="price">Price (USD)</label>
              <input id="price" name="price" type="number" step="0.01" min="0" required placeholder="0 = free" className="input" />
            </div>
          )}
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
        <button disabled={busy} className="btn btn-primary w-full">
          {busy ? "Posting…" : donate ? "Post donation" : "Publish listing"}
        </button>
      </form>
    </Modal>
  );
}

export function ProductModal({
  product,
  userId,
  onClose,
  onMessage,
  onChanged,
}: {
  product: Product;
  userId: string | null;
  onClose: () => void;
  onMessage: (p: Product) => Promise<string | void>;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const images = product.example
    ? [product.example.image]
    : [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((i) => imageUrl(i.storage_path));
  const [shown, setShown] = useState(0);
  const mine = !!userId && userId === product.seller_id;
  const available = product.status === "active";

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

  return (
    <Modal title={product.title} onClose={onClose}>
      <div className="space-y-3">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-surface">
          {images[shown] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[shown]} alt={product.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink">No photo</div>
          )}
          {!available && <div className="absolute inset-0 flex items-center justify-center bg-brand/60 text-2xl font-bold text-white">SOLD</div>}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2">
            {images.map((src, i) => (
              <button key={src} onClick={() => setShown(i)} className={`h-12 w-12 overflow-hidden rounded-md border-2 ${i === shown ? "border-accent" : "border-transparent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        <p className="text-2xl font-extrabold text-brand">{price(product.price_cents)}</p>
        <p className="text-sm text-ink">
          {label(CATEGORIES, product.category)} · {label(CONDITIONS, product.condition)} · {product.campus}
          {product.pickup_location ? ` · Pickup: ${product.pickup_location}` : ""}
        </p>
        <p className="whitespace-pre-wrap text-sm">{product.description}</p>
        {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        {product.example ? (
          <p className="rounded-md bg-mist p-3 text-sm text-brand">
            This is an example listing to show how DormCycle works. Real student listings appear at the top of the page.
          </p>
        ) : mine ? (
          <div className="flex flex-wrap gap-2">
            {available ? (
              <button disabled={busy} onClick={() => run(() => setStatus("sold"))} className="btn btn-primary">Mark as sold</button>
            ) : (
              <button disabled={busy} onClick={() => run(() => setStatus("active"))} className="btn btn-outline">Relist</button>
            )}
            <button disabled={busy} onClick={() => run(remove)} className="btn border border-red-300 bg-white text-red-700 hover:bg-red-50">Delete</button>
          </div>
        ) : available ? (
          <div className="space-y-2">
            <button disabled={busy} onClick={() => run(() => onMessage(product))} className="btn btn-primary w-full">
              Message seller
            </button>
            <p className="text-xs text-ink">
              Opens a chat with the seller to ask about the item and set up a campus handoff. Agree on payment between yourselves when you meet.
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
