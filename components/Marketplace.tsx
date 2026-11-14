"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabase, imageUrl } from "@/lib/supabase";
import { CAMPUSES, CATEGORIES, CONDITIONS, EXAMPLES, label, price, type Product } from "@/lib/data";
import { AuthModal, ProductModal, SellModal } from "./Modals";
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
  const [sellOpen, setSellOpen] = useState(false);
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
            <div className="flex rounded-lg border border-slate-300 p-0.5">
              <button onClick={() => setTab("buy")} className={`rounded-md px-4 py-1.5 text-sm font-semibold ${tab === "buy" ? "bg-brand text-white" : "text-brand hover:bg-mist"}`}>Buy</button>
              <button onClick={() => { setTab("sell"); requireLogin(); }} className={`rounded-md px-4 py-1.5 text-sm font-semibold ${tab === "sell" ? "bg-brand text-white" : "text-brand hover:bg-mist"}`}>Sell</button>
            </div>
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
            <section className="flex flex-col items-start gap-4 rounded-2xl bg-mist p-6 sm:flex-row sm:items-center sm:p-8">
              <Image src="/brand/logo.png" alt="DormCycle logo" width={96} height={96} />
              <div>
                <h1 className="text-3xl font-extrabold text-brand sm:text-4xl">Don&apos;t toss it. Keep it going.</h1>
                <p className="mt-2 max-w-xl text-ink">
                  A student-to-student marketplace for dorm essentials, useful finds, and easy campus handoffs.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href="#items" className="btn btn-primary">Browse items</a>
                  <button onClick={() => { if (requireLogin()) setSellOpen(true); }} className="btn btn-accent">Sell something</button>
                </div>
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
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-mist p-6">
              <div>
                <h1 className="text-2xl font-extrabold text-brand">Sell on DormCycle</h1>
                <p className="text-ink">Snap a photo, set a price, and meet your buyer on campus.</p>
              </div>
              <button onClick={() => { if (requireLogin()) setSellOpen(true); }} className="btn btn-primary">+ List an item</button>
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

      <footer className="border-t border-slate-200 bg-surface py-6 text-center text-xs text-ink">
        © {new Date().getFullYear()} DormCycle · Meet in public campus spots · Example photos from{" "}
        <a href="https://unsplash.com" className="underline">Unsplash</a>
      </footer>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {sellOpen && userId && (
        <SellModal userId={userId} onClose={() => setSellOpen(false)} onDone={() => { setSellOpen(false); setTab("sell"); load(); }} />
      )}
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
        />
      )}
      <ChatWidget userId={userId} open={chatOpen} setOpen={setChatOpen} activeId={chatId} setActiveId={setChatId} onNeedLogin={() => setAuthOpen(true)} />
    </>
  );
}
