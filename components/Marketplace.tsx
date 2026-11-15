"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabase, imageUrl } from "@/lib/supabase";

const CART_KEY = "dormcycle-cart";
import { CAMPUSES, CATEGORIES, CONDITIONS, EXAMPLES, label, price, type Product } from "@/lib/data";
import { AuthModal, CheckoutModal, DonateModal, InfoModal, OrdersModal, ProductModal, SellModal } from "./Modals";
import CartDrawer, { type CartItem } from "./CartDrawer";
import ChatWidget from "./ChatWidget";
import NotificationBell from "./NotificationBell";

type Filters = { category: string; campus: string; condition: string; maxPrice: string; sort: string };
const NO_FILTERS: Filters = { category: "", campus: "", condition: "", maxPrice: "", sort: "newest" };

function Card({ p, onOpen }: { p: Product; onOpen: () => void }) {
  const first = p.example
    ? p.example.image
    : [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((i) => imageUrl(i.storage_path))[0];
  return (
    <button onClick={onOpen} className="card group overflow-hidden text-left transition hover:shadow-md">
      <div className="relative aspect-square bg-surface">
        {first ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={first} alt={p.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink">No photo</div>
        )}
        {p.example && <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-brand">Example</span>}
        {p.status === "sold" && <div className="absolute inset-0 flex items-center justify-center bg-brand/60 text-lg font-bold text-white">SOLD</div>}
      </div>
      <div className="space-y-0.5 p-3">
        <p className="text-base font-bold text-brand">{price(p.price_cents)}</p>
        <p className="truncate text-sm font-medium">{p.title}</p>
        <p className="truncate text-xs text-ink">{label(CONDITIONS, p.condition)} · {p.pickup_location || p.campus}</p>
      </div>
    </button>
  );
}

export default function Marketplace() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [sellMode, setSellMode] = useState<"sell" | "donate" | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [donateOpen, setDonateOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartNote, setCartNote] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("products")
      .select("*, product_images(storage_path, sort_order)")
      .in("status", ["active", "sold"])
      .order("created_at", { ascending: false })
      .limit(200);
    setProducts((data ?? []) as Product[]);
    setLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setUserId(data.session?.user.id ?? null);
      setUserName((data.session?.user.user_metadata?.full_name as string) ?? "");
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setUserName((session?.user.user_metadata?.full_name as string) ?? "");
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  // Restored after hydration so the server and first client render agree.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      try {
        const saved = window.localStorage.getItem(CART_KEY);
        if (saved) setCart(JSON.parse(saved) as CartItem[]);
      } catch {
        // A blocked or corrupt store just means an empty cart.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // Ignore: the cart still works for this page view.
    }
  }, [cart]);

  function addToCart(p: Product) {
    const first = p.example
      ? p.example.image
      : [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((i) => imageUrl(i.storage_path))[0];
    setCart((prev) =>
      prev.some((i) => i.id === p.id)
        ? prev
        : [...prev, { id: p.id, title: p.title, price_cents: p.price_cents, seller_id: p.seller_id, image: first ?? null, example: !!p.example }],
    );
    setCartNote("");
    setSelected(null);
    setCartOpen(true);
  }

  // Checkout opens the order form; the cart only needs to be valid first.
  function startCheckout() {
    if (!requireLogin() || !userId) return;
    if (cart.some((i) => i.example)) {
      return setCartNote("Example listings are just samples. Remove them to check out.");
    }
    if (cart.some((i) => i.seller_id === userId)) {
      return setCartNote("One of these is your own listing. Remove it to check out.");
    }
    setCartNote("");
    setCartOpen(false);
    setCheckoutOpen(true);
  }

  // Demo checkout: records a pending order per item and messages each seller. No payment is taken.
  async function placeOrder(note: string): Promise<{ error?: string; orderIds?: string[] }> {
    if (!userId) return { error: "Please log in again." };
    const orderIds: string[] = [];

    for (const item of cart) {
      const { data, error } = await supabase
        .from("orders")
        .insert({
          buyer_id: userId,
          seller_id: item.seller_id,
          product_id: item.id,
          amount_cents: item.price_cents,
          currency: "usd",
          status: "pending",
        })
        .select("id")
        .single();
      if (error || !data) return { error: error?.message ?? "Could not record the order." };
      orderIds.push(data.id as string);
    }

    const bySeller = new Map<string, CartItem[]>();
    cart.forEach((i) => bySeller.set(i.seller_id, [...(bySeller.get(i.seller_id) ?? []), i]));

    for (const group of bySeller.values()) {
      const { data: convId, error } = await supabase.rpc("start_conversation", { p_product_id: group[0].id });
      if (error || !convId) return { error: error?.message ?? "Order saved, but the seller could not be messaged." };
      const lines = group.map((i) => `${i.title} (${price(i.price_cents)})`).join(", ");
      const subtotal = group.reduce((sum, i) => sum + i.price_cents, 0);
      const message =
        `Order placed on DormCycle: ${lines}. Total ${price(subtotal)}, paid at handoff.` +
        (note ? ` Note: ${note}` : "") +
        " When and where can we meet?";
      const { error: msgErr } = await supabase
        .from("messages")
        .insert({ conversation_id: convId, sender_id: userId, message_text: message });
      if (msgErr) return { error: msgErr.message };
      setChatId(convId as string);
    }

    setCart([]);
    return { orderIds };
  }

  const matches = useCallback(
    (p: Product) => {
      const term = q.trim().toLowerCase();
      if (term && !`${p.title} ${p.description} ${label(CATEGORIES, p.category)}`.toLowerCase().includes(term)) return false;
      if (filters.category === "free" ? p.price_cents !== 0 : filters.category && p.category !== filters.category) return false;
      if (filters.campus && p.campus !== filters.campus) return false;
      if (filters.condition && p.condition !== filters.condition) return false;
      if (filters.maxPrice && p.price_cents > parseFloat(filters.maxPrice) * 100) return false;
      return true;
    },
    [q, filters],
  );

  const sortFn = useCallback(
    (a: Product, b: Product) =>
      filters.sort === "low" ? a.price_cents - b.price_cents
      : filters.sort === "high" ? b.price_cents - a.price_cents
      : +new Date(b.created_at) - +new Date(a.created_at),
    [filters.sort],
  );

  const forSale = useMemo(() => products.filter((p) => p.status === "active" && matches(p)).sort(sortFn), [products, matches, sortFn]);
  const examples = useMemo(() => EXAMPLES.filter(matches).sort(sortFn), [matches, sortFn]);
  const mine = useMemo(() => products.filter((p) => p.seller_id === userId), [products, userId]);
  const liveProducts = useMemo(() => products.filter((p) => p.status === "active"), [products]);
  const freeCount = liveProducts.filter((p) => p.price_cents === 0).length;
  const campusCount = new Set(liveProducts.map((p) => p.campus)).size;
  const justListed = liveProducts.slice(0, 3);

  const activeFilters = Object.entries(filters).filter(([k, v]) => k !== "sort" && v).length;

  function requireLogin() {
    if (userId) return true;
    setAuthOpen(true);
    return false;
  }

  async function openChat(p: Product, firstMessage?: string): Promise<string | void> {
    if (!requireLogin() || !userId) return;
    const { data: convId, error } = await supabase.rpc("start_conversation", { p_product_id: p.id });
    if (error || !convId) return error?.message ?? "Could not start the chat.";
    if (firstMessage) {
      const { error: msgErr } = await supabase.from("messages").insert({ conversation_id: convId, sender_id: userId, message_text: firstMessage });
      if (msgErr) return msgErr.message;
    }
    setSelected(null);
    setChatId(convId as string);
    setChatOpen(true);
  }

  function openSell(mode: "sell" | "donate") {
    if (requireLogin()) setSellMode(mode);
  }

  function openDonate() {
    if (requireLogin()) setDonateOpen(true);
  }

  // Footer shortcuts jump back to the grid with a filter applied.
  function browse(category: string) {
    setTab("buy");
    setFilters((f) => ({ ...f, category }));
    document.getElementById("items")?.scrollIntoView({ behavior: "smooth" });
  }

  function browseCampus(campus: string) {
    setTab("buy");
    setFilters((f) => ({ ...f, campus }));
  }

  const pill = (on: boolean) =>
    `whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition ${on ? "border-brand bg-brand text-white" : "border-slate-300 bg-white text-ink hover:bg-mist"}`;
  const setF = (k: keyof Filters, v: string) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <a href="#" className="flex items-center gap-2" onClick={() => setTab("buy")}>
            <Image src="/brand/logo.png" alt="" width={36} height={36} priority />
            <span className="text-xl font-extrabold tracking-tight text-brand">Dorm<span className="text-accent">Cycle</span></span>
          </a>

          <div className="relative order-last flex w-full gap-2 sm:order-none sm:w-auto sm:max-w-xl sm:flex-1">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dorm essentials…" aria-label="Search" className="input" />
            <button onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} className="btn btn-outline shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M3 6h18M6 12h12M10 18h4" /></svg>
              Filters{activeFilters ? ` (${activeFilters})` : ""}
            </button>
            {showFilters && (
              <div className="card absolute right-0 top-full z-40 mt-2 w-full space-y-3 p-4 shadow-lg sm:w-80">
                <div>
                  <label className="label" htmlFor="f-cat">Category</label>
                  <select id="f-cat" value={filters.category} onChange={(e) => setF("category", e.target.value)} className="input">
                    <option value="">All items</option>
                    {CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    <option value="free">Free items</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="f-campus">Campus</label>
                  <select id="f-campus" value={filters.campus} onChange={(e) => setF("campus", e.target.value)} className="input">
                    <option value="">All campuses</option>
                    {CAMPUSES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="f-cond">Condition</label>
                    <select id="f-cond" value={filters.condition} onChange={(e) => setF("condition", e.target.value)} className="input">
                      <option value="">Any</option>
                      {CONDITIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="f-max">Max price ($)</label>
                    <input id="f-max" type="number" min="0" value={filters.maxPrice} onChange={(e) => setF("maxPrice", e.target.value)} className="input" />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="f-sort">Sort by</label>
                  <select id="f-sort" value={filters.sort} onChange={(e) => setF("sort", e.target.value)} className="input">
                    <option value="newest">Newest first</option>
                    <option value="low">Price: low to high</option>
                    <option value="high">Price: high to low</option>
                  </select>
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setFilters(NO_FILTERS)} className="text-sm font-semibold text-accent">Clear all</button>
                  <button onClick={() => setShowFilters(false)} className="btn btn-primary">Show results</button>
                </div>
              </div>
            )}
          </div>

          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => (userId ? setChatOpen(!chatOpen) : setAuthOpen(true))}
              aria-label="Messages"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-brand hover:bg-mist"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
              </svg>
            </button>
            <NotificationBell
              userId={userId}
              onNeedLogin={() => setAuthOpen(true)}
              onOpenConversation={(id) => {
                setChatId(id);
                setChatOpen(true);
              }}
            />
            <button
              onClick={() => { setTab("sell"); requireLogin(); }}
              className={`btn ${tab === "sell" ? "btn-outline" : "btn-primary"}`}
            >
              Sell
            </button>
            <button onClick={openDonate} className="btn btn-outline">Donate</button>
            {userId ? (
              <button onClick={() => supabase.auth.signOut()} className="text-sm font-medium text-ink hover:text-brand" title={userName}>Log out</button>
            ) : (
              <button onClick={() => setAuthOpen(true)} className="text-sm font-semibold text-brand">Log in</button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6">
        {tab === "buy" ? (
          <>
            <section className="relative overflow-hidden rounded-2xl bg-[radial-gradient(120%_130%_at_88%_22%,#0a6e94_0%,#065277_38%,#004165_62%,#00263d_100%)] px-6 pb-8 pt-12 text-white sm:px-10 sm:pb-10 sm:pt-14">
              <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
              <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-accent" aria-hidden />
                The student marketplace, close to home
              </p>

              <h1 className="mt-6 text-4xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl">
                Don&apos;t toss it.
                <br />
                <span className="text-[#86d5f2]">Keep it going.</span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
                Find what your room is missing, or pass along what you&apos;re ready to leave behind. Good things have
                more than one college life.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
                <a href="#items" className="btn rounded-xl bg-white px-6 py-3 text-base text-brand hover:bg-mist">
                  Explore campus finds <span aria-hidden>→</span>
                </a>
                <button onClick={() => setInfo("how")} className="text-sm font-semibold text-white/90 hover:text-white">
                  How DormCycle works <span aria-hidden>→</span>
                </button>
              </div>

              <p className="mt-7 flex items-center gap-2 text-xs text-white/55">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-accent" aria-hidden>
                  <path d="M12 2l1.8 6.4L20 10l-6.2 1.6L12 18l-1.8-6.4L4 10l6.2-1.6z" />
                </svg>
                Made for student-to-student campus handoffs
              </p>

              {/* Decorative: two finds orbiting the DormCycle mark. */}
              <div className="relative mt-8 hidden h-44 select-none sm:block" aria-hidden>
                <svg viewBox="0 0 640 176" className="absolute inset-0 h-full w-full" fill="none" preserveAspectRatio="none">
                  <ellipse cx="320" cy="88" rx="196" ry="70" transform="rotate(-9 320 88)" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
                </svg>

                <div className="absolute left-[3%] top-[10%] w-44 rounded-2xl bg-white/12 px-4 py-3 ring-1 ring-white/25 backdrop-blur-sm">
                  <span className="text-accent" aria-hidden>↗</span>
                  <p className="mt-1 font-semibold">Good finds</p>
                  <p className="text-xs text-white/60">Second life starts here</p>
                </div>

                <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1.5 rounded-full bg-white/12 text-center ring-1 ring-white/25 backdrop-blur-sm">
                  <Image src="/brand/logo.png" alt="" width={46} height={46} />
                  <p className="text-[11px] font-semibold leading-tight">
                    one more
                    <br />
                    college life
                  </p>
                </div>

                <div className="absolute right-[3%] top-[40%] w-44 rounded-2xl bg-white/12 px-4 py-3 ring-1 ring-white/25 backdrop-blur-sm">
                  <span className="text-accent" aria-hidden>✶</span>
                  <p className="mt-1 font-semibold">Close by</p>
                  <p className="text-xs text-white/60">Meet on campus</p>
                </div>
              </div>
              </div>

              <aside className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">On campus right now</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-extrabold">{liveProducts.length}</p>
                    <p className="text-xs text-white/65">listings</p>
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold">{freeCount}</p>
                    <p className="text-xs text-white/65">free items</p>
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold">{campusCount}</p>
                    <p className="text-xs text-white/65">campuses</p>
                  </div>
                </div>

                <div className="mt-5 border-t border-white/15 pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Just listed</p>
                  {justListed.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {justListed.map((p) => (
                        <li key={p.id}>
                          <button
                            onClick={() => setSelected(p)}
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/10"
                          >
                            <span className="min-w-0 truncate">{p.title}</span>
                            <span className="shrink-0 font-semibold text-[#86d5f2]">{price(p.price_cents)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-white/70">
                      Nothing listed yet — your old desk lamp could be the first thing another student finds here.
                    </p>
                  )}
                </div>

                <button
                  onClick={() => { if (requireLogin()) setSellMode("sell"); }}
                  className="btn btn-accent mt-5 w-full"
                >
                  List an item
                </button>
              </aside>
              </div>
            </section>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => setF("category", "")} className={pill(!filters.category)}>All items</button>
              {CATEGORIES.map(([k, v]) => <button key={k} onClick={() => setF("category", k)} className={pill(filters.category === k)}>{v}</button>)}
              <button onClick={() => setF("category", "free")} className={pill(filters.category === "free")}>Free items</button>
            </div>

            <section id="items" className="scroll-mt-24 space-y-3">
              <h2 className="text-lg font-bold text-brand">For sale on campus</h2>
              {forSale.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {forSale.map((p) => <Card key={p.id} p={p} onOpen={() => setSelected(p)} />)}
                </div>
              ) : (
                <div className="card p-6 text-center text-sm text-ink">
                  {!loaded ? "Loading listings…" : activeFilters || q ? "No listings match your search yet." : "No student listings yet. Be the first to list something!"}
                </div>
              )}
            </section>

            {examples.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-brand">Example listings</h2>
                <p className="text-sm text-ink">Samples of what students list on DormCycle. They aren&apos;t real items for sale.</p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {examples.map((p) => <Card key={p.id} p={p} onOpen={() => setSelected(p)} />)}
                </div>
              </section>
            )}

          </>
        ) : (
          <section className="space-y-4">
            <button onClick={() => setTab("buy")} className="text-sm font-semibold text-accent">
              ← Back to listings
            </button>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-mist p-6">
              <div>
                <h1 className="text-2xl font-extrabold text-brand">Sell on DormCycle</h1>
                <p className="text-ink">Snap a photo, set a price, and meet your buyer on campus.</p>
              </div>
              <button onClick={() => { openSell("sell"); }} className="btn btn-primary">+ List an item</button>
            </div>
            <h2 className="text-lg font-bold text-brand">Your listings</h2>
            {!userId ? (
              <div className="card p-6 text-center text-sm text-ink">
                <button onClick={() => setAuthOpen(true)} className="font-semibold text-accent">Log in</button> to see and manage your listings.
              </div>
            ) : mine.length === 0 ? (
              <div className="card p-6 text-center text-sm text-ink">You haven&apos;t listed anything yet.</div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {mine.map((p) => <Card key={p.id} p={p} onOpen={() => setSelected(p)} />)}
              </div>
            )}
          </section>
        )}
      </main>

      <footer id="footer" className="mt-12 bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.7fr]">
            <div>
              <h2 className="text-lg font-bold text-brand">DormCycle</h2>
              <ul className="mt-6 space-y-5 text-ink">
                <li><button onClick={() => setInfo("about")} className="hover:text-brand">About us</button></li>
                <li><button onClick={() => setInfo("how")} className="hover:text-brand">How it works</button></li>
                <li><button onClick={() => setInfo("safety")} className="hover:text-brand">Campus safety</button></li>
                <li><button onClick={() => { if (requireLogin()) setOrdersOpen(true); }} className="hover:text-brand">Your orders</button></li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold text-brand">Sell</h2>
              <ul className="mt-6 space-y-5 text-ink">
                <li><button onClick={() => openSell("sell")} className="hover:text-brand">Sell an item</button></li>
                <li><button onClick={openDonate} className="hover:text-brand">Donate an item</button></li>
                <li><button onClick={() => setInfo("selling")} className="hover:text-brand">Selling tips</button></li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold text-brand">Browse</h2>
              <ul className="mt-6 space-y-5 text-ink">
                <li><button onClick={() => browse("")} className="hover:text-brand">All items</button></li>
                <li><button onClick={() => browse("free")} className="hover:text-brand">Free items</button></li>
                <li><button onClick={() => browse("furniture")} className="hover:text-brand">Furniture</button></li>
                <li><button onClick={() => browse("textbooks")} className="hover:text-brand">Textbooks</button></li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold text-brand">Give something back</h2>
              <div className="mt-6 flex items-start gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-mist">
                  <Image src="/brand/logo.png" alt="" width={52} height={52} />
                </div>
                <div>
                  <p className="text-ink">
                    Leaving something behind at move-out? Post a photo and a short description, and pass it on to the
                    next student for free.
                  </p>
                  <button onClick={openDonate} className="btn btn-primary mt-4">Donate now</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-200/70">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm text-ink">
            <label className="flex items-center gap-2">
              <span className="sr-only">Campus</span>
              <select
                value={filters.campus}
                onChange={(e) => browseCampus(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1"
              >
                <option value="">All campuses</option>
                {CAMPUSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <button onClick={() => setInfo("safety")} className="hover:text-brand">Campus safety</button>
              <button onClick={() => setInfo("how")} className="hover:text-brand">How it works</button>
              <a href="https://unsplash.com" className="hover:text-brand">Example photos</a>
              <span>© {new Date().getFullYear()} DormCycle</span>
            </nav>
          </div>
        </div>
      </footer>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {sellMode && userId && (
        <SellModal
          userId={userId}
          onClose={() => setSellMode(null)}
          onDone={() => { setSellMode(null); setTab("sell"); load(); }}
        />
      )}
      {donateOpen && userId && <DonateModal userId={userId} onClose={() => setDonateOpen(false)} />}
      {info && <InfoModal topic={info} onClose={() => setInfo(null)} />}
      {checkoutOpen && userId && (
        <CheckoutModal
          items={cart}
          onClose={() => setCheckoutOpen(false)}
          onPlace={placeOrder}
          onViewMessages={() => { setCheckoutOpen(false); setChatOpen(true); }}
        />
      )}
      {ordersOpen && userId && <OrdersModal userId={userId} onClose={() => setOrdersOpen(false)} />}
      {selected && (
        <ProductModal
          key={selected.id}
          product={selected}
          userId={userId}
          onClose={() => setSelected(null)}
          onMessage={(p) =>
            openChat(
              p,
              p.price_cents === 0
                ? `Hi! Is "${p.title}" still available? I'd love to take it off your hands.`
                : `Hi! Is "${p.title}" still available?`,
            )
          }
          onChanged={() => { setSelected(null); load(); }}
          onOffer={(p, cents) =>
            openChat(
              p,
              `Hi! Would you take ${price(cents)} for "${p.title}"? It's listed at ${price(p.price_cents)}.`,
            )
          }
          onAddToCart={addToCart}
          inCart={cart.some((i) => i.id === selected.id)}
        />
      )}
      <CartDrawer
        items={cart}
        open={cartOpen}
        setOpen={setCartOpen}
        onRemove={(id) => setCart((prev) => prev.filter((i) => i.id !== id))}
        onCheckout={startCheckout}
        busy={false}
        note={cartNote}
      />
      <ChatWidget userId={userId} open={chatOpen} setOpen={setChatOpen} activeId={chatId} setActiveId={setChatId} onNeedLogin={() => setAuthOpen(true)} />
    </>
  );
}
