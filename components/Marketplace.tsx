"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CAMPUSES, CATALOG, CATEGORIES, CONDITIONS, label, price, type Product } from "@/lib/data";
import { CART_KEY, firstImage, type CartItem } from "@/lib/cart";
import { AuthModal, CheckoutModal, DonateModal, InfoModal, OrdersModal, SellModal } from "./Modals";
import CartDrawer from "./CartDrawer";
import ChatWidget from "./ChatWidget";
import NotificationBell from "./NotificationBell";

type Filters = { category: string; campus: string; condition: string; maxPrice: string; sort: string };
const NO_FILTERS: Filters = { category: "", campus: "", condition: "", maxPrice: "", sort: "newest" };

const CATEGORY_ICONS: Record<string, string> = {
  all: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  furniture: "M5 10V6a2 2 0 012-2h10a2 2 0 012 2v4M4 10h16v4H4zM6 14v5M18 14v5",
  electronics: "M3 5h18v11H3zM8 20h8M12 16v4",
  textbooks: "M5 4h11a2 2 0 012 2v14H7a2 2 0 01-2-2zM9 4v16",
  clothing: "M8 3l4 2 4-2 4 3-2 3-2-1v12H8V8L6 9 4 6z",
  kitchen: "M4 7h12v7a4 4 0 01-4 4H8a4 4 0 01-4-4zM16 9h2a2 2 0 110 4h-2",
  other: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
  free: "M12 21s-7-4.3-7-9a4 4 0 017-2.6A4 4 0 0119 12c0 4.7-7 9-7 9z",
};

function SearchField({
  q,
  setQ,
  showFilters,
  setShowFilters,
  activeFilters,
}: {
  q: string;
  setQ: (v: string) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  activeFilters: number;
}) {
  return (
    <div className="flex h-12 w-full items-center gap-2 rounded-full border border-slate-200 bg-white pl-4 pr-1.5 shadow-sm transition focus-within:border-accent focus-within:shadow">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-ink" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search for a fridge, a desk lamp, textbooks…"
        aria-label="Search listings"
        className="h-full w-full bg-transparent text-[15px] outline-none placeholder:text-ink/70"
      />
      <button
        onClick={() => setShowFilters(!showFilters)}
        aria-expanded={showFilters}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-sm font-semibold text-brand transition hover:bg-mist"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M3 6h18M6 12h12M10 18h4" /></svg>
        Filters{activeFilters ? ` (${activeFilters})` : ""}
      </button>
    </div>
  );
}

function CategoryIcon({ name }: { name: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={CATEGORY_ICONS[name] ?? CATEGORY_ICONS.other} />
    </svg>
  );
}

function HeroShot({ img, alt, tag, h }: { img: string; alt: string; tag: string; h: string }) {
  return (
    <figure className={`relative overflow-hidden rounded-2xl ring-1 ring-white/25 ${h}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://images.unsplash.com/${img}?w=640&q=70&auto=format&fit=crop`}
        alt={alt}
        className="h-full w-full object-cover"
      />
      <figcaption className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
        {tag}
      </figcaption>
    </figure>
  );
}

function Card({ p }: { p: Product }) {
  const first = firstImage(p);
  const free = p.price_cents === 0;
  return (
    <Link
      href={`/listing/${p.id}`}
      className="card group overflow-hidden text-left transition duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-surface">
        {first ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={first} alt={p.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.07]" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink">No photo yet</div>
        )}
        {free && !(p.status === "sold") && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
            Free
          </span>
        )}
        {p.status === "sold" && (
          <div className="absolute inset-0 flex items-center justify-center bg-brand/60 text-lg font-bold tracking-wide text-white">SOLD</div>
        )}
      </div>
      <div className="space-y-1 p-3.5">
        <p className="text-base font-extrabold text-brand">{price(p.price_cents)}</p>
        <p className="truncate text-sm font-medium">{p.title}</p>
        <p className="flex items-center gap-1.5 truncate text-xs text-ink">
          <span className="rounded-full bg-surface px-2 py-0.5 font-semibold">{label(CONDITIONS, p.condition)}</span>
          <span className="truncate">{p.pickup_location || p.campus}</span>
        </p>
      </div>
    </Link>
  );
}

export default function Marketplace() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
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
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const [cartReady, setCartReady] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
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
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      setUserName((data.session?.user.user_metadata?.full_name as string) ?? "");
      if (uid) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
        if (!cancelled) setIsAdmin(profile?.role === "admin");
      } else {
        setIsAdmin(false);
      }
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
      setCartReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The listing pages hand work back here through the URL: a chat to open, a checkout to finish.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      const params = new URLSearchParams(window.location.search);
      if (params.toString() === "") return;
      const chat = params.get("chat");
      const category = params.get("category");
      if (chat) {
        setChatId(chat);
        setChatOpen(true);
      }
      if (category) setFilters((f) => ({ ...f, category }));
      if (params.get("login")) setAuthOpen(true);
      if (params.get("checkout")) setPendingCheckout(true);
      window.history.replaceState({}, "", "/");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Wait for the stored cart before acting, or a "Buy now" arrives at an empty cart.
  useEffect(() => {
    if (!pendingCheckout || !cartReady) return;
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (!userId) return setAuthOpen(true);
      setPendingCheckout(false);
      if (cart.length === 0) return;
      if (cart.some((i) => i.seller_id === userId)) {
        setCartNote("One of these is your own listing. Remove it to check out.");
        return setCartOpen(true);
      }
      setCheckoutOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingCheckout, cartReady, userId, cart]);

  useEffect(() => {
    try {
      if (cartReady) window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // Ignore: the cart still works for this page view.
    }
  }, [cart, cartReady]);

  // Checkout opens the order form; the cart only needs to be valid first.
  function startCheckout() {
    if (!requireLogin() || !userId) return;
    if (cart.some((i) => i.seller_id === userId)) {
      return setCartNote("One of these is your own listing. Remove it to check out.");
    }
    setCartNote("");
    setCartOpen(false);
    setCheckoutOpen(true);
  }

  // Demo checkout: records a pending order per item and messages each seller. No payment is taken.
  async function placeOrder(note: string): Promise<{ error?: string; orderIds?: string[]; demo?: boolean }> {
    if (!userId) return { error: "Please log in again." };
    const orderIds: string[] = [];

    // Catalog listings are not stored rows, so they get a sample receipt instead of a stored order.
    const real = cart.filter((i) => !i.example);
    const demo = real.length === 0;

    for (const item of real) {
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
    real.forEach((i) => bySeller.set(i.seller_id, [...(bySeller.get(i.seller_id) ?? []), i]));

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

    if (demo) orderIds.push(`demo${Math.random().toString(36).slice(2, 10)}`);

    setCart([]);
    return { orderIds, demo };
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

  const forSale = useMemo(
    () => [...products.filter((p) => p.status === "active"), ...CATALOG].filter(matches).sort(sortFn),
    [products, matches, sortFn],
  );
  const mine = useMemo(() => products.filter((p) => p.seller_id === userId), [products, userId]);
  // Hero counts cover everything on the page so the board never reads as empty.
  const liveProducts = useMemo(
    () => [...products.filter((p) => p.status === "active"), ...CATALOG],
    [products],
  );
  const freeCount = liveProducts.filter((p) => p.price_cents === 0).length;
  const campusCount = new Set(liveProducts.map((p) => p.campus)).size;

  const activeFilters = Object.entries(filters).filter(([k, v]) => k !== "sort" && v).length;

  function requireLogin() {
    if (userId) return true;
    setAuthOpen(true);
    return false;
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
    `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${on ? "border-brand bg-brand text-white shadow-sm" : "border-slate-200 bg-white text-ink hover:border-accent/50 hover:bg-mist hover:text-brand"}`;
  const setF = (k: keyof Filters, v: string) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex h-20 items-center gap-4">
            {/* Logo */}
            <a href="#" onClick={() => setTab("buy")} className="flex shrink-0 items-center gap-2.5">
              <Image src="/brand/logo.png" alt="" width={44} height={44} priority />
              <span className="hidden text-2xl font-extrabold tracking-tight text-brand sm:block">
                Dorm<span className="text-accent">Cycle</span>
              </span>
            </a>

            {/* Search, centre stage */}
            <div className="relative mx-auto hidden w-full max-w-xl md:block">
              <SearchField
                q={q}
                setQ={setQ}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                activeFilters={activeFilters}
              />
            </div>

            {/* Buy / Sell */}
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center rounded-full bg-surface p-1 lg:flex">
                <button
                  onClick={() => { setTab("buy"); document.getElementById("items")?.scrollIntoView({ behavior: "smooth" }); }}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === "buy" ? "bg-white text-brand shadow-sm" : "text-ink hover:text-brand"}`}
                >
                  Buy
                </button>
                <button
                  onClick={() => { setTab("sell"); requireLogin(); }}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === "sell" ? "bg-white text-brand shadow-sm" : "text-ink hover:text-brand"}`}
                >
                  Sell
                </button>
              </div>

              {/* Campus */}
              <label className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-ink xl:flex">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M12 21s-7-5.6-7-10a7 7 0 1114 0c0 4.4-7 10-7 10z" strokeLinejoin="round" />
                  <circle cx="12" cy="11" r="2.4" />
                </svg>
                <span className="sr-only">Campus</span>
                <select
                  value={filters.campus}
                  onChange={(e) => setF("campus", e.target.value)}
                  className="max-w-[9rem] cursor-pointer truncate bg-transparent font-medium outline-none"
                >
                  <option value="">All campuses</option>
                  {CAMPUSES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>

              <button
                onClick={() => (userId ? setChatOpen(!chatOpen) : setAuthOpen(true))}
                aria-label="Messages"
                className="flex h-10 w-10 items-center justify-center rounded-full text-brand transition hover:bg-mist"
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

              <button onClick={() => { setTab("sell"); requireLogin(); }} className="btn btn-primary lg:hidden">Sell</button>
              <button onClick={openDonate} className="btn btn-outline hidden xl:inline-flex">Donate</button>

              {userId ? (
                <button onClick={() => supabase.auth.signOut()} className="whitespace-nowrap px-1 text-sm font-medium text-ink hover:text-brand" title={userName}>Log out</button>
              ) : (
                <button onClick={() => setAuthOpen(true)} className="whitespace-nowrap px-1 text-sm font-semibold text-brand">Log in</button>
              )}
            </div>
          </div>

          {/* Search on small screens */}
          <div className="relative pb-3 md:hidden">
            <SearchField
              q={q}
              setQ={setQ}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              activeFilters={activeFilters}
            />

          </div>
        </div>

          {showFilters && (
            <div className="absolute inset-x-0 top-full z-40 px-4 pb-4">
              <div className="mx-auto max-w-6xl">
                <div className="card ml-auto w-full space-y-3 p-4 shadow-xl sm:w-80">
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
              </div>
            </div>
          )}
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

              <aside className="relative">
                {/* A corner of campus life, changing hands. */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-3 sm:space-y-4">
                    <HeroShot img="photo-1632119289059-793dd347950f" alt="A dorm room with a bed and a desk" tag="A room coming together" h="h-40 sm:h-56" />
                    <HeroShot img="photo-1540961403310-79825242906e" alt="A mini fridge" tag="Mini fridge · $60" h="h-28 sm:h-36" />
                  </div>
                  <div className="space-y-3 pt-6 sm:space-y-4 sm:pt-10">
                    <HeroShot img="photo-1519219788971-8d9797e0928e" alt="A desk lamp" tag="Desk lamp · $12" h="h-28 sm:h-36" />
                    <HeroShot img="photo-1495446815901-a7297e633e8d" alt="A stack of textbooks" tag="Textbooks · $40" h="h-40 sm:h-56" />
                  </div>
                </div>

                <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-extrabold text-brand shadow-lg ring-1 ring-black/5">
                  <Image src="/brand/logo.png" alt="" width={20} height={20} />
                  Passed on, not tossed
                </div>

                <div className="mt-5 flex items-center justify-center gap-5 text-center text-xs text-white/70 sm:gap-7">
                  <p><span className="mr-1.5 text-base font-extrabold text-white">{liveProducts.length}</span>listings</p>
                  <span className="h-3 w-px bg-white/25" aria-hidden />
                  <p><span className="mr-1.5 text-base font-extrabold text-white">{freeCount}</span>free</p>
                  <span className="h-3 w-px bg-white/25" aria-hidden />
                  <p><span className="mr-1.5 text-base font-extrabold text-white">{campusCount}</span>campuses</p>
                </div>
              </aside>
              </div>
            </section>

            <div className="sticky top-16 z-20 -mx-4 overflow-x-auto bg-white/90 px-4 py-3 backdrop-blur">
              <div className="flex gap-2">
                <button onClick={() => setF("category", "")} className={pill(!filters.category)}>
                  <CategoryIcon name="all" /> All items
                </button>
                {CATEGORIES.map(([k, v]) => (
                  <button key={k} onClick={() => setF("category", k)} className={pill(filters.category === k)}>
                    <CategoryIcon name={k} /> {v}
                  </button>
                ))}
                <button onClick={() => setF("category", "free")} className={pill(filters.category === "free")}>
                  <CategoryIcon name="free" /> Free items
                </button>
              </div>
            </div>

            <section id="items" className="scroll-mt-32 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="flex items-center gap-3 text-lg font-extrabold text-brand">
                  <span className="h-5 w-1 rounded-full bg-accent" aria-hidden />
                  Listings
                </h2>
                {loaded && (
                  <p className="text-sm text-ink">
                    {forSale.length} {forSale.length === 1 ? "item" : "items"}
                    {filters.category ? ` in ${filters.category === "free" ? "free items" : label(CATEGORIES, filters.category)}` : ""}
                  </p>
                )}
              </div>
              {forSale.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {forSale.map((p) => <Card key={p.id} p={p} />)}
                </div>
              ) : (
                <div className="card flex flex-col items-center gap-3 p-10 text-center text-sm text-ink">
                  <Image src="/brand/logo.png" alt="" width={34} height={34} className="opacity-40" />
                  {!loaded ? "Loading listings…" : "Nothing matches that search yet. Try another category or clear the filters."}
                  {loaded && (
                    <button onClick={() => { setQ(""); setFilters(NO_FILTERS); }} className="btn btn-outline">
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </section>

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
                {mine.map((p) => <Card key={p.id} p={p} />)}
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
              {isAdmin && <a href="/admin" className="font-semibold text-accent hover:text-brand">Admin dashboard</a>}
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
