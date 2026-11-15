"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CAMPUSES, CATEGORIES, label, type Product } from "@/lib/data";
import {
  CAMPAIGNS,
  COMMISSION_RATE,
  INVENTORY,
  ORDERS,
  REPORTS,
  USERS,
  categoryBreakdown,
  channelMix,
  compact,
  inventoryFromProduct,
  inventoryTotals,
  money,
  moneyExact,
  orderMix,
  revenueOf,
  salesSeries,
  shortDate,
  topSellers,
  type InventoryRow,
  type OrderRow,
  type Period,
  type ReportRow,
  type UserRow,
} from "@/lib/admin";
import { Bars, Donut, SalesChart, Spark } from "@/components/admin/Charts";

type Section =
  | "overview"
  | "inventory"
  | "listings"
  | "orders"
  | "payments"
  | "users"
  | "reports"
  | "categories"
  | "announcements"
  | "analytics"
  | "settings";

const NAV: { key: Section; name: string; icon: string }[] = [
  { key: "overview", name: "Overview", icon: "M3 12l9-8 9 8v8a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" },
  { key: "inventory", name: "Inventory", icon: "M3 7l9-4 9 4-9 4-9-4zm0 5l9 4 9-4m-18 5l9 4 9-4" },
  { key: "listings", name: "Listings", icon: "M4 5h16v4H4zm0 6h16v4H4zm0 6h10v2H4z" },
  { key: "orders", name: "Orders", icon: "M6 4h12l1 16H5zM9 8h6" },
  { key: "payments", name: "Payments", icon: "M3 7h18v10H3zm0 4h18" },
  { key: "users", name: "Users", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zm-8 8a8 8 0 1116 0z" },
  { key: "reports", name: "Reports", icon: "M12 3l9 16H3zM12 9v4m0 3h.01" },
  { key: "categories", name: "Categories", icon: "M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z" },
  { key: "announcements", name: "Announcements", icon: "M4 10v4h4l6 4V6l-6 4H4zm13 0a4 4 0 010 4" },
  { key: "analytics", name: "Analytics", icon: "M5 20V10m7 10V4m7 16v-7" },
  { key: "settings", name: "Settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM4 12h2m12 0h2M12 4v2m0 12v2" },
];

const chip = (tone: "ok" | "warn" | "bad" | "mute") =>
  `rounded-full px-2 py-0.5 text-xs font-semibold ${
    tone === "ok"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warn"
        ? "bg-amber-50 text-amber-800"
        : tone === "bad"
          ? "bg-red-50 text-red-700"
          : "bg-slate-100 text-slate-600"
  }`;

const statusTone = (s: string) =>
  s === "completed" || s === "published" || s === "active" || s === "resolved"
    ? "ok"
    : s === "cancelled" || s === "suspended" || s === "open"
      ? "bad"
      : s === "refunded" || s === "reviewing" || s === "awaiting pickup"
        ? "warn"
        : "mute";

function Tile({
  name,
  value,
  note,
  trend,
  tint,
}: {
  name: string;
  value: string;
  note: string;
  trend: number[];
  tint: string;
}) {
  return (
    <div className={`rounded-2xl p-4 ${tint}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-brand/70">{name}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-2xl font-extrabold text-brand">{value}</p>
        <Spark values={trend} />
      </div>
      <p className="mt-1 text-xs text-ink">{note}</p>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-brand">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function AdminDashboard() {
  const [state, setState] = useState<"checking" | "guest" | "denied" | "ok">("checking");
  const [adminName, setAdminName] = useState("");
  const [section, setSection] = useState<Section>("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("monthly");

  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [liveOrders, setLiveOrders] = useState<OrderRow[]>([]);
  const [donations, setDonations] = useState(0);

  const [inventory, setInventory] = useState<InventoryRow[]>(INVENTORY);
  const [orders, setOrders] = useState<OrderRow[]>(ORDERS);
  const [users, setUsers] = useState<UserRow[]>(USERS);
  const [reports, setReports] = useState<ReportRow[]>(REPORTS);
  const [categories, setCategories] = useState(
    CATEGORIES.map(([key, name]) => ({ key, name, active: true })),
  );
  const [announcements, setAnnouncements] = useState([
    { id: "a1", title: "Move-out donation window opens Dec 8", body: "Donations are accepted in the last four days of the semester.", posted: "Nov 10" },
    { id: "a2", title: "Pickup spots moved indoors", body: "Winter handoffs happen in the residence hall lobbies.", posted: "Nov 2" },
  ]);
  const [settings, setSettings] = useState({
    commission: Math.round(COMMISSION_RATE * 100),
    newListings: true,
    donationWindow: true,
    autoHideReported: false,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return setState("guest");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      setAdminName((profile?.full_name as string) || user.email || "Admin");
      if (profile?.role !== "admin") return setState("denied");
      setState("ok");

      const [products, orderRows, donationRows, reportRows] = await Promise.all([
        supabase.from("products").select("*, product_images(storage_path, sort_order)"),
        supabase.from("orders").select("id, amount_cents, status, created_at"),
        supabase.from("donations").select("id"),
        supabase.from("listing_reports").select("id, listing_title, reason, details, status, created_at"),
      ]);

      if (products.data) setLiveProducts(products.data as Product[]);
      if (orderRows.data) {
        setLiveOrders(
          (orderRows.data as { id: string; amount_cents: number; status: string; created_at: string }[]).map((o) => ({
            id: o.id.slice(0, 6).toUpperCase(),
            buyer: "DormCycle member",
            item: "Student listing",
            amount_cents: o.amount_cents,
            status: o.status === "paid" ? "completed" : "processing",
            placed: o.created_at,
            channel: "Direct",
          })),
        );
      }
      if (donationRows.data) setDonations(donationRows.data.length);
      if (reportRows.data?.length) {
        const live = (reportRows.data as {
          id: string; listing_title: string; reason: string; status: string; created_at: string;
        }[]).map((r) => ({
          id: `R-${r.id.slice(0, 4).toUpperCase()}`,
          target: r.listing_title,
          kind: "listing" as const,
          reason: r.reason,
          reporter: "A member",
          opened: r.created_at,
          status: (r.status === "resolved" ? "resolved" : r.status === "reviewing" ? "reviewing" : "open") as ReportRow["status"],
        }));
        setReports((prev) => [...live, ...prev]);
      }
    })();
  }, []);

  const allInventory = useMemo(
    () => [...liveProducts.map(inventoryFromProduct), ...inventory],
    [liveProducts, inventory],
  );
  const allOrders = useMemo(() => [...liveOrders, ...orders], [liveOrders, orders]);

  const totals = inventoryTotals(allInventory);
  const gross = revenueOf(allOrders);
  const commission = Math.round(gross * (settings.commission / 100));
  const openReports = reports.filter((r) => r.status !== "resolved").length;
  const series = salesSeries(period);

  if (state === "checking") {
    return <Centered title="Checking your access…" body="One moment." />;
  }
  if (state === "guest") {
    return (
      <Centered
        title="Admin sign-in required"
        body="Log in on the marketplace with an admin account, then come back to this page."
      />
    );
  }
  if (state === "denied") {
    return (
      <Centered
        title="This area is for administrators"
        body={`You're signed in as ${adminName}, which doesn't have admin access on DormCycle.`}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 shrink-0 bg-brand text-white transition-transform lg:static lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 px-5">
          <Image src="/brand/logo.png" alt="" width={26} height={26} />
          <span className="font-extrabold">DormCycle</span>
          <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase">Admin</span>
        </div>
        <nav className="space-y-0.5 px-3 pb-6">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setSection(item.key);
                setNavOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                section === item.key ? "bg-white/15 font-semibold" : "text-white/75 hover:bg-white/10"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item.name}
            </button>
          ))}
        </nav>
        <div className="mx-3 rounded-xl bg-white/10 p-3 text-xs text-white/80">
          <p className="font-semibold text-white">{adminName}</p>
          <p>Full administrator</p>
          <Link href="/" className="mt-2 inline-block font-semibold text-[#86d5f2]">
            ← Back to marketplace
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <button onClick={() => setNavOpen((v) => !v)} className="rounded-lg p-2 hover:bg-surface lg:hidden" aria-label="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold text-brand">
              {NAV.find((n) => n.key === section)?.name}
            </h1>
            <p className="truncate text-xs text-ink">
              {totals.skus} live listings · {compact(users.length)} members · {openReports} open reports
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={chip("ok")}>All systems normal</span>
          </div>
        </header>

        <main className="space-y-5 p-4 sm:p-6">
          {section === "overview" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Tile
                  name="Gross sales"
                  value={money(gross)}
                  note="Completed handoffs, all time"
                  trend={series.values.slice(-7)}
                  tint="bg-[#ede9fe]"
                />
                <Tile
                  name="Commission"
                  value={money(commission)}
                  note={`${settings.commission}% platform fee`}
                  trend={series.values.slice(-7).map((v) => v * 0.05)}
                  tint="bg-[#e0f2fe]"
                />
                <Tile
                  name="Orders"
                  value={compact(allOrders.length)}
                  note={`${allOrders.filter((o) => o.status === "awaiting pickup").length} awaiting pickup`}
                  trend={[12, 18, 15, 22, 28, 24, 31]}
                  tint="bg-[#ffedd5]"
                />
                <Tile
                  name="Members"
                  value={compact(users.length)}
                  note={`${users.filter((u) => u.status === "suspended").length} suspended`}
                  trend={[60, 74, 88, 101, 119, 134, users.length]}
                  tint="bg-[#f1f5f9]"
                />
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
                <Panel
                  title="Sales overview"
                  action={
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value as Period)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  }
                >
                  <SalesChart labels={series.labels} values={series.values} format={money} />
                </Panel>

                <Panel
                  title="Inventory status"
                  action={
                    <button onClick={() => setSection("inventory")} className="text-sm font-semibold text-accent">
                      Manage →
                    </button>
                  }
                >
                  <ul className="space-y-3">
                    {[
                      { name: "In stock", value: totals.units, tone: "bg-emerald-500" },
                      { name: "Low stock", value: totals.low, tone: "bg-amber-500" },
                      { name: "Out of stock", value: totals.out, tone: "bg-red-500" },
                      { name: "Donations queued", value: donations, tone: "bg-accent" },
                    ].map((row) => (
                      <li key={row.name} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5">
                        <span className="flex items-center gap-2 text-sm text-ink">
                          <span className={`h-2.5 w-2.5 rounded-full ${row.tone}`} />
                          {row.name}
                        </span>
                        <span className="text-lg font-extrabold text-brand">{row.value}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => setSection("inventory")} className="btn btn-primary mt-4 w-full">
                    Manage inventory
                  </button>
                </Panel>
              </div>

              <div className="grid gap-5 xl:grid-cols-3">
                <Panel title="Top selling listings">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-ink">
                        <th className="pb-2 font-semibold">Listing</th>
                        <th className="pb-2 text-right font-semibold">Sales</th>
                        <th className="pb-2 text-right font-semibold">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSellers(allInventory).map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="py-2 pr-2">
                            <p className="truncate font-medium text-brand">{row.title}</p>
                            <p className="text-xs text-ink">{label(CATEGORIES, row.category)}</p>
                          </td>
                          <td className="py-2 text-right font-semibold">{money(row.revenue)}</td>
                          <td className="py-2 text-right text-ink">{row.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Panel>

                <Panel
                  title="Recent orders"
                  action={
                    <button onClick={() => setSection("orders")} className="text-sm font-semibold text-accent">
                      View all →
                    </button>
                  }
                >
                  <ul className="space-y-2.5">
                    {allOrders.slice(0, 5).map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="font-mono text-xs text-ink">#{o.id}</span>
                          <p className="truncate text-sm font-medium text-brand">{o.buyer}</p>
                        </span>
                        <span className={chip(statusTone(o.status))}>{o.status}</span>
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel title="Order status">
                  <Donut slices={orderMix(allOrders)} caption="orders" />
                </Panel>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Panel title="How buyers arrive">
                  <Donut slices={channelMix(allOrders)} caption="orders" />
                </Panel>
                <Panel title="Campus outreach">
                  <Bars
                    rows={CAMPAIGNS.map((c) => ({
                      name: c.name,
                      value: c.clicks,
                      sub: `${c.clicks} clicks · ${compact(c.reach)} reach`,
                    }))}
                    format={(n) => `${n}`}
                  />
                </Panel>
              </div>
            </>
          )}

          {section === "inventory" && (
            <InventorySection rows={allInventory} onChange={setInventory} base={inventory} />
          )}

          {section === "listings" && <ListingsSection rows={allInventory} onChange={setInventory} base={inventory} />}

          {section === "orders" && <OrdersSection rows={allOrders} onChange={setOrders} base={orders} />}

          {section === "payments" && (
            <PaymentsSection orders={allOrders} rate={settings.commission} gross={gross} commission={commission} />
          )}

          {section === "users" && <UsersSection rows={users} onChange={setUsers} />}

          {section === "reports" && <ReportsSection rows={reports} onChange={setReports} />}

          {section === "categories" && (
            <CategoriesSection rows={categories} inventory={allInventory} onChange={setCategories} />
          )}

          {section === "announcements" && (
            <AnnouncementsSection rows={announcements} onChange={setAnnouncements} />
          )}

          {section === "analytics" && (
            <AnalyticsSection inventory={allInventory} orders={allOrders} series={series} />
          )}

          {section === "settings" && (
            <SettingsSection settings={settings} onChange={setSettings} admins={users.filter((u) => u.role !== "student")} />
          )}
        </main>
      </div>
    </div>
  );
}

function Centered({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="card max-w-md space-y-3 p-8 text-center">
        <Image src="/brand/logo.png" alt="" width={40} height={40} className="mx-auto" />
        <h1 className="text-xl font-extrabold text-brand">{title}</h1>
        <p className="text-sm text-ink">{body}</p>
        <Link href="/" className="btn btn-primary mt-2 inline-block">
          Go to the marketplace
        </Link>
      </div>
    </div>
  );
}

function Search({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:w-64"
    />
  );
}

function InventorySharedTable({
  rows,
  onStock,
  onStatus,
}: {
  rows: InventoryRow[];
  onStock?: (id: string, delta: number) => void;
  onStatus: (id: string, status: InventoryRow["status"]) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-ink">
            <th className="pb-2 font-semibold">Listing</th>
            <th className="pb-2 font-semibold">Source</th>
            <th className="pb-2 text-right font-semibold">Price</th>
            {onStock && <th className="pb-2 text-right font-semibold">Stock</th>}
            <th className="pb-2 text-right font-semibold">Sold</th>
            <th className="pb-2 font-semibold">Status</th>
            <th className="pb-2 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="py-2.5 pr-3">
                <p className="font-medium text-brand">{r.title}</p>
                <p className="text-xs text-ink">
                  {label(CATEGORIES, r.category)} · {r.campus} · updated {shortDate(r.updated)}
                </p>
              </td>
              <td className="py-2.5 text-xs text-ink">{r.source === "dormcycle" ? "DormCycle stock" : "Member"}</td>
              <td className="py-2.5 text-right font-semibold">{moneyExact(r.price_cents)}</td>
              {onStock && (
                <td className="py-2.5 text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <button onClick={() => onStock(r.id, -1)} className="rounded border border-slate-200 px-1.5 leading-5 hover:bg-surface">−</button>
                    <span className={`w-7 text-center font-semibold ${r.stock === 0 ? "text-red-600" : r.stock <= 3 ? "text-amber-600" : ""}`}>{r.stock}</span>
                    <button onClick={() => onStock(r.id, 1)} className="rounded border border-slate-200 px-1.5 leading-5 hover:bg-surface">+</button>
                  </span>
                </td>
              )}
              <td className="py-2.5 text-right text-ink">{r.sold}</td>
              <td className="py-2.5"><span className={chip(statusTone(r.status))}>{r.status}</span></td>
              <td className="py-2.5 text-right">
                <span className="inline-flex gap-1.5">
                  {r.status !== "published" && (
                    <button onClick={() => onStatus(r.id, "published")} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold hover:bg-surface">Publish</button>
                  )}
                  {r.status === "published" && (
                    <button onClick={() => onStatus(r.id, "unpublished")} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold hover:bg-surface">Hide</button>
                  )}
                  {r.status !== "archived" && (
                    <button onClick={() => onStatus(r.id, "archived")} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">Archive</button>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="py-8 text-center text-sm text-ink">Nothing matches that filter.</p>}
    </div>
  );
}

function useInventoryActions(base: InventoryRow[], onChange: (rows: InventoryRow[]) => void) {
  const setStatus = (id: string, status: InventoryRow["status"]) =>
    onChange(base.map((r) => (r.id === id ? { ...r, status, updated: new Date().toISOString() } : r)));
  const setStock = (id: string, delta: number) =>
    onChange(base.map((r) => (r.id === id ? { ...r, stock: Math.max(0, r.stock + delta) } : r)));
  return { setStatus, setStock };
}

function InventorySection({
  rows,
  base,
  onChange,
}: {
  rows: InventoryRow[];
  base: InventoryRow[];
  onChange: (rows: InventoryRow[]) => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatusFilter] = useState("all");
  const { setStatus, setStock } = useInventoryActions(base, onChange);
  const totals = inventoryTotals(rows);

  const filtered = rows.filter(
    (r) =>
      (status === "all" || r.status === status) &&
      (q === "" || r.title.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-4">
        <Tile name="Units in stock" value={String(totals.units)} note={`${totals.skus} live listings`} trend={[220, 248, 266, 291, 305, 318, totals.units]} tint="bg-[#e0f2fe]" />
        <Tile name="Low stock" value={String(totals.low)} note="3 or fewer left" trend={[18, 15, 14, 12, 13, 11, totals.low]} tint="bg-[#ffedd5]" />
        <Tile name="Out of stock" value={String(totals.out)} note="Needs restocking" trend={[8, 7, 6, 6, 5, 5, totals.out]} tint="bg-[#fee2e2]" />
        <Tile name="DormCycle stock" value={String(rows.filter((r) => r.source === "dormcycle").length)} note="Managed by the team" trend={[10, 12, 14, 15, 17, 18, 19]} tint="bg-[#f1f5f9]" />
      </div>

      <Panel
        title="Inventory"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Search value={q} onChange={setQ} placeholder="Search inventory…" />
            <select value={status} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-sm">
              <option value="all">All status</option>
              <option value="published">Published</option>
              <option value="unpublished">Hidden</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        }
      >
        <InventorySharedTable rows={filtered} onStock={setStock} onStatus={setStatus} />
      </Panel>
    </>
  );
}

function ListingsSection({
  rows,
  base,
  onChange,
}: {
  rows: InventoryRow[];
  base: InventoryRow[];
  onChange: (rows: InventoryRow[]) => void;
}) {
  const [q, setQ] = useState("");
  const [campus, setCampus] = useState("all");
  const { setStatus } = useInventoryActions(base, onChange);

  const filtered = rows.filter(
    (r) =>
      (campus === "all" || r.campus === campus) &&
      (q === "" || r.title.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <Panel
      title="Listings moderation"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Search value={q} onChange={setQ} placeholder="Search listings…" />
          <select value={campus} onChange={(e) => setCampus(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-sm">
            <option value="all">All campuses</option>
            {CAMPUSES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      }
    >
      <p className="mb-3 text-sm text-ink">
        Hiding a listing removes it from the marketplace immediately. Archived listings stay on the seller&apos;s
        profile but can&apos;t be bought.
      </p>
      <InventorySharedTable rows={filtered} onStatus={setStatus} />
    </Panel>
  );
}

function OrdersSection({
  rows,
  base,
  onChange,
}: {
  rows: OrderRow[];
  base: OrderRow[];
  onChange: (rows: OrderRow[]) => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const update = (id: string, next: OrderRow["status"]) =>
    onChange(base.map((o) => (o.id === id ? { ...o, status: next } : o)));

  const filtered = rows.filter(
    (o) =>
      (status === "all" || o.status === status) &&
      (q === "" || `${o.buyer} ${o.item} ${o.id}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <Panel
      title={`Orders (${filtered.length})`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Search value={q} onChange={setQ} placeholder="Search buyer, item or #id…" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-sm">
            <option value="all">All status</option>
            <option value="completed">Completed</option>
            <option value="awaiting pickup">Awaiting pickup</option>
            <option value="processing">Processing</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink">
              <th className="pb-2 font-semibold">Order</th>
              <th className="pb-2 font-semibold">Buyer</th>
              <th className="pb-2 font-semibold">Item</th>
              <th className="pb-2 text-right font-semibold">Amount</th>
              <th className="pb-2 font-semibold">Placed</th>
              <th className="pb-2 font-semibold">Status</th>
              <th className="pb-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 60).map((o) => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="py-2.5 font-mono text-xs">#{o.id}</td>
                <td className="py-2.5 font-medium text-brand">{o.buyer}</td>
                <td className="py-2.5 text-ink">{o.item}</td>
                <td className="py-2.5 text-right font-semibold">{moneyExact(o.amount_cents)}</td>
                <td className="py-2.5 text-ink">{shortDate(o.placed)}</td>
                <td className="py-2.5"><span className={chip(statusTone(o.status))}>{o.status}</span></td>
                <td className="py-2.5 text-right">
                  <span className="inline-flex gap-1.5">
                    {o.status !== "completed" && (
                      <button onClick={() => update(o.id, "completed")} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold hover:bg-surface">Complete</button>
                    )}
                    {o.status !== "refunded" && (
                      <button onClick={() => update(o.id, "refunded")} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50">Refund</button>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 60 && <p className="pt-3 text-xs text-ink">Showing the 60 most recent of {filtered.length}.</p>}
      </div>
    </Panel>
  );
}

function PaymentsSection({
  orders,
  rate,
  gross,
  commission,
}: {
  orders: OrderRow[];
  rate: number;
  gross: number;
  commission: number;
}) {
  const refunded = orders.filter((o) => o.status === "refunded").reduce((s, o) => s + o.amount_cents, 0);
  const paid = orders.filter((o) => o.status === "completed");

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-4">
        <Tile name="Gross volume" value={money(gross)} note="Completed handoffs" trend={[4, 6, 5, 9, 11, 10, 14]} tint="bg-[#e0f2fe]" />
        <Tile name={`Commission (${rate}%)`} value={money(commission)} note="Platform earnings" trend={[1, 2, 2, 3, 4, 4, 6]} tint="bg-[#ede9fe]" />
        <Tile name="To sellers" value={money(gross - commission)} note="Before processing fees" trend={[3, 5, 4, 8, 9, 9, 12]} tint="bg-[#dcfce7]" />
        <Tile name="Refunded" value={money(refunded)} note={`${orders.filter((o) => o.status === "refunded").length} orders`} trend={[1, 1, 2, 1, 2, 2, 3]} tint="bg-[#ffedd5]" />
      </div>

      <Panel title="Payment activity">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink">
                <th className="pb-2 font-semibold">Order</th>
                <th className="pb-2 font-semibold">Item</th>
                <th className="pb-2 text-right font-semibold">Amount</th>
                <th className="pb-2 text-right font-semibold">Fee</th>
                <th className="pb-2 text-right font-semibold">Seller gets</th>
                <th className="pb-2 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {paid.slice(0, 25).map((o) => {
                const fee = Math.round(o.amount_cents * (rate / 100));
                return (
                  <tr key={o.id} className="border-t border-slate-100">
                    <td className="py-2.5 font-mono text-xs">#{o.id}</td>
                    <td className="py-2.5 text-brand">{o.item}</td>
                    <td className="py-2.5 text-right font-semibold">{moneyExact(o.amount_cents)}</td>
                    <td className="py-2.5 text-right text-ink">{moneyExact(fee)}</td>
                    <td className="py-2.5 text-right">{moneyExact(o.amount_cents - fee)}</td>
                    <td className="py-2.5 text-ink">{shortDate(o.placed)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink">
          Payouts run through the connected payment account. Processing fees, disputes and chargebacks are settled
          there and aren&apos;t included in the seller column.
        </p>
      </Panel>
    </>
  );
}

function UsersSection({ rows, onChange }: { rows: UserRow[]; onChange: (rows: UserRow[]) => void }) {
  const [q, setQ] = useState("");
  const filtered = rows.filter((u) => q === "" || u.name.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) =>
    onChange(rows.map((u) => (u.id === id ? { ...u, status: u.status === "active" ? "suspended" : "active" } : u)));

  return (
    <Panel
      title={`Members (${rows.length})`}
      action={<Search value={q} onChange={setQ} placeholder="Search members…" />}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink">
              <th className="pb-2 font-semibold">Member</th>
              <th className="pb-2 font-semibold">Campus</th>
              <th className="pb-2 font-semibold">Role</th>
              <th className="pb-2 text-right font-semibold">Listings</th>
              <th className="pb-2 text-right font-semibold">Orders</th>
              <th className="pb-2 font-semibold">Status</th>
              <th className="pb-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 40).map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="py-2.5">
                  <p className="font-medium text-brand">{u.name}</p>
                  <p className="text-xs text-ink">Joined {shortDate(u.joined)}</p>
                </td>
                <td className="py-2.5 text-ink">{u.campus}</td>
                <td className="py-2.5 capitalize text-ink">{u.role}</td>
                <td className="py-2.5 text-right">{u.listings}</td>
                <td className="py-2.5 text-right">{u.orders}</td>
                <td className="py-2.5"><span className={chip(statusTone(u.status))}>{u.status}</span></td>
                <td className="py-2.5 text-right">
                  <button onClick={() => toggle(u.id)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold hover:bg-surface">
                    {u.status === "active" ? "Suspend" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 40 && <p className="pt-3 text-xs text-ink">Showing 40 of {filtered.length}.</p>}
      </div>
    </Panel>
  );
}

function ReportsSection({ rows, onChange }: { rows: ReportRow[]; onChange: (rows: ReportRow[]) => void }) {
  const set = (id: string, status: ReportRow["status"]) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, status } : r)));

  return (
    <Panel title={`Moderation queue (${rows.filter((r) => r.status !== "resolved").length} open)`}>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-brand">
                  {r.reason} <span className="font-normal text-ink">· {r.kind}</span>
                </p>
                <p className="text-sm text-ink">
                  {r.target} — reported by {r.reporter} on {shortDate(r.opened)}
                </p>
              </div>
              <span className={chip(statusTone(r.status))}>{r.status}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.status !== "reviewing" && r.status !== "resolved" && (
                <button onClick={() => set(r.id, "reviewing")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-surface">Start review</button>
              )}
              {r.status !== "resolved" && (
                <button onClick={() => set(r.id, "resolved")} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">Resolve</button>
              )}
              {r.status === "resolved" && (
                <button onClick={() => set(r.id, "open")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-surface">Reopen</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function CategoriesSection({
  rows,
  inventory,
  onChange,
}: {
  rows: { key: string; name: string; active: boolean }[];
  inventory: InventoryRow[];
  onChange: (rows: { key: string; name: string; active: boolean }[]) => void;
}) {
  const [name, setName] = useState("");

  return (
    <>
      <Panel title="Categories">
        <ul className="divide-y divide-slate-100">
          {rows.map((c) => (
            <li key={c.key} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <input
                  value={c.name}
                  onChange={(e) => onChange(rows.map((r) => (r.key === c.key ? { ...r, name: e.target.value } : r)))}
                  className="w-48 rounded-lg border border-transparent px-2 py-1 font-medium text-brand hover:border-slate-200 focus:border-slate-300"
                />
                <span className="ml-2 text-xs text-ink">
                  {inventory.filter((i) => i.category === c.key).length} listings
                </span>
              </div>
              <button
                onClick={() => onChange(rows.map((r) => (r.key === c.key ? { ...r, active: !r.active } : r)))}
                className={chip(c.active ? "ok" : "mute")}
              >
                {c.active ? "Active" : "Hidden"}
              </button>
            </li>
          ))}
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onChange([...rows, { key: name.trim().toLowerCase().replace(/\s+/g, "-"), name: name.trim(), active: true }]);
            setName("");
          }}
          className="mt-4 flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New category name"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button className="btn btn-primary">Add</button>
        </form>
      </Panel>
    </>
  );
}

function AnnouncementsSection({
  rows,
  onChange,
}: {
  rows: { id: string; title: string; body: string; posted: string }[];
  onChange: (rows: { id: string; title: string; body: string; posted: string }[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <>
      <Panel title="Post an announcement">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            onChange([
              {
                id: Math.random().toString(36).slice(2, 8),
                title: title.trim(),
                body: body.trim(),
                posted: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              },
              ...rows,
            ]);
            setTitle("");
            setBody("");
          }}
          className="space-y-3"
        >
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Headline" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="What should members know?" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button className="btn btn-primary">Publish</button>
        </form>
      </Panel>

      <Panel title="Posted">
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand">{a.title}</p>
                  <p className="text-sm text-ink">{a.body}</p>
                </div>
                <span className="shrink-0 text-xs text-ink">{a.posted}</span>
              </div>
              <button onClick={() => onChange(rows.filter((r) => r.id !== a.id))} className="mt-2 text-xs font-semibold text-red-700">
                Remove
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

function AnalyticsSection({
  inventory,
  orders,
  series,
}: {
  inventory: InventoryRow[];
  orders: OrderRow[];
  series: { labels: string[]; values: number[] };
}) {
  const byCategory = categoryBreakdown(inventory);
  const campuses = [...new Set(inventory.map((i) => i.campus))].map((c) => ({
    campus: c,
    listings: inventory.filter((i) => i.campus === c).length,
    revenue: inventory.filter((i) => i.campus === c).reduce((s, i) => s + i.sold * i.price_cents, 0),
  }));

  return (
    <>
      <Panel title="Sales trend">
        <SalesChart labels={series.labels} values={series.values} format={money} />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Revenue by category">
          <Bars rows={byCategory.map((c) => ({ name: c.name, value: c.revenue, sub: `${money(c.revenue)} · ${c.listings} listings` }))} format={money} />
        </Panel>
        <Panel title="Where orders come from">
          <Donut slices={channelMix(orders)} caption="orders" />
        </Panel>
      </div>

      <Panel title="Campus activity">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink">
              <th className="pb-2 font-semibold">Campus</th>
              <th className="pb-2 text-right font-semibold">Listings</th>
              <th className="pb-2 text-right font-semibold">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {campuses.map((c) => (
              <tr key={c.campus} className="border-t border-slate-100">
                <td className="py-2.5 font-medium text-brand">{c.campus}</td>
                <td className="py-2.5 text-right">{c.listings}</td>
                <td className="py-2.5 text-right font-semibold">{money(c.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

function SettingsSection({
  settings,
  onChange,
  admins,
}: {
  settings: { commission: number; newListings: boolean; donationWindow: boolean; autoHideReported: boolean };
  onChange: (s: typeof settings) => void;
  admins: UserRow[];
}) {
  const toggles: { key: "newListings" | "donationWindow" | "autoHideReported"; name: string; note: string }[] = [
    { key: "newListings", name: "Accept new listings", note: "Turn off to pause posting during a break." },
    { key: "donationWindow", name: "Donation window open", note: "Donations are accepted in the last four days of the semester." },
    { key: "autoHideReported", name: "Auto-hide reported listings", note: "Hide a listing as soon as it gets three reports." },
  ];

  return (
    <>
      <Panel title="Marketplace settings">
        <label className="block max-w-xs">
          <span className="text-sm font-semibold text-brand">Commission rate</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={30}
              value={settings.commission}
              onChange={(e) => onChange({ ...settings, commission: Number(e.target.value) })}
              className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <span className="text-sm text-ink">% of each sale</span>
          </div>
        </label>

        <ul className="mt-5 divide-y divide-slate-100">
          {toggles.map((t) => (
            <li key={t.key} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium text-brand">{t.name}</p>
                <p className="text-xs text-ink">{t.note}</p>
              </div>
              <button
                onClick={() => onChange({ ...settings, [t.key]: !settings[t.key] })}
                className={`h-6 w-11 shrink-0 rounded-full transition ${settings[t.key] ? "bg-accent" : "bg-slate-300"}`}
                aria-pressed={settings[t.key]}
              >
                <span className={`block h-5 w-5 rounded-full bg-white transition ${settings[t.key] ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Team">
        <ul className="divide-y divide-slate-100">
          {admins.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2.5">
              <span className="font-medium text-brand">{a.name}</span>
              <span className={chip(a.role === "admin" ? "ok" : "mute")}>{a.role}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink">
          Admin access is granted in the database, not from this screen, so no one can promote themselves here.
        </p>
      </Panel>
    </>
  );
}
