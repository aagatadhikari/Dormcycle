import { CATALOG, CATEGORIES, label, type Product } from "@/lib/data";

/**
 * Operational data for the admin dashboard.
 *
 * Inventory, orders, users and reports are derived from the catalog with a fixed seed, so every
 * admin sees the same board and the numbers stay stable between renders. Live rows pulled from
 * Supabase are merged in on top of this by the dashboard itself.
 */

export const COMMISSION_RATE = 0.05;

export type Period = "weekly" | "monthly" | "yearly";

export type InventoryRow = {
  id: string;
  title: string;
  category: string;
  price_cents: number;
  stock: number;
  sold: number;
  campus: string;
  source: "student" | "dormcycle";
  status: "published" | "unpublished" | "archived";
  updated: string;
};

export type OrderRow = {
  id: string;
  buyer: string;
  item: string;
  amount_cents: number;
  status: "completed" | "awaiting pickup" | "processing" | "cancelled" | "refunded";
  placed: string;
  channel: string;
};

export type UserRow = {
  id: string;
  name: string;
  campus: string;
  role: "student" | "moderator" | "admin";
  joined: string;
  listings: number;
  orders: number;
  status: "active" | "suspended";
};

export type ReportRow = {
  id: string;
  target: string;
  kind: "listing" | "user" | "message";
  reason: string;
  reporter: string;
  opened: string;
  status: "open" | "reviewing" | "resolved";
};

// Small deterministic hash so the same listing always produces the same numbers.
function seed(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const pick = <T,>(list: T[], key: string, salt = 0) => list[(seed(key) + salt) % list.length];
const between = (key: string, min: number, max: number, salt = 0) =>
  min + ((seed(key) + salt) % (max - min + 1));

const FIRST = [
  "Ava", "Logan", "Maya", "Caleb", "Priya", "Noah", "Jade", "Owen", "Imani", "Felix",
  "Nina", "Theo", "Rosa", "Dev", "Clara", "Mateo", "Hana", "Isaac", "Lena", "Kofi",
];
const LAST = [
  "Brandt", "Okafor", "Nguyen", "Keller", "Sharma", "Mendez", "Fischer", "Osei", "Lindqvist",
  "Patel", "Rivera", "Novak", "Haugen", "Castillo", "Weber", "Abebe", "Moreau", "Kim",
];

const personFor = (key: string) => `${pick(FIRST, key)} ${pick(LAST, key, 7)}`;

const DAY = 24 * 60 * 60 * 1000;
export const TODAY = new Date(Date.UTC(2026, 10, 14));
const daysBack = (n: number) => new Date(TODAY.getTime() - n * DAY).toISOString();

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Stock, sales and publication state for every item on the board. */
export const INVENTORY: InventoryRow[] = CATALOG.map((p) => {
  const stock = between(p.id, 1, 14);
  const sold = between(p.id, 0, 23, 3);
  const unpublished = seed(p.id) % 17 === 0;
  const archived = seed(p.id) % 29 === 0;
  return {
    id: p.id,
    title: p.title,
    category: p.category,
    price_cents: p.price_cents,
    stock: seed(p.id) % 11 === 0 ? 0 : stock,
    sold,
    campus: p.campus,
    source: seed(p.id) % 3 === 0 ? "dormcycle" : "student",
    status: archived ? "archived" : unpublished ? "unpublished" : "published",
    updated: daysBack(between(p.id, 0, 21, 11)),
  };
});

export const inventoryTotals = (rows: InventoryRow[]) => {
  const live = rows.filter((r) => r.status === "published");
  return {
    units: live.reduce((sum, r) => sum + r.stock, 0),
    low: live.filter((r) => r.stock > 0 && r.stock <= 3).length,
    out: live.filter((r) => r.stock === 0).length,
    skus: live.length,
  };
};

const ORDER_STATUS: OrderRow["status"][] = [
  "completed", "completed", "completed", "awaiting pickup", "awaiting pickup", "processing", "cancelled", "refunded",
];
const CHANNELS = ["Search", "Direct", "Campus link", "Referral"];

/** One order per sale recorded against the catalog. */
export const ORDERS: OrderRow[] = INVENTORY.flatMap((row) =>
  Array.from({ length: Math.min(row.sold, 9) }, (_, i) => {
    const key = `${row.id}-${i}`;
    return {
      id: seed(key).toString(16).slice(0, 6).toUpperCase(),
      buyer: personFor(key),
      item: row.title,
      amount_cents: row.price_cents,
      status: pick(ORDER_STATUS, key, i),
      placed: daysBack(between(key, 0, 180, i)),
      channel: pick(CHANNELS, key, 5),
    };
  }),
).sort((a, b) => b.placed.localeCompare(a.placed));

export const USERS: UserRow[] = Array.from({ length: 148 }, (_, i) => {
  const key = `user-${i}`;
  const campuses = [...new Set(CATALOG.map((p) => p.campus))];
  return {
    id: key,
    name: personFor(key),
    campus: pick(campuses, key),
    role: i === 0 ? "admin" : i < 4 ? "moderator" : "student",
    joined: daysBack(between(key, 1, 320)),
    listings: between(key, 0, 7, 2),
    orders: between(key, 0, 11, 4),
    status: seed(key) % 23 === 0 ? "suspended" : "active",
  };
});

const REASONS = [
  "Item looks counterfeit",
  "Price looks like a scam",
  "Prohibited item",
  "Buyer never showed for pickup",
  "Rude messages",
  "Duplicate listing",
  "Photo isn't the real item",
];

export const REPORTS: ReportRow[] = Array.from({ length: 9 }, (_, i) => {
  const key = `report-${i}`;
  const target = CATALOG[seed(key) % CATALOG.length];
  return {
    id: `R-${1200 + i}`,
    target: target.title,
    kind: i % 4 === 0 ? "user" : i % 3 === 0 ? "message" : "listing",
    reason: pick(REASONS, key),
    reporter: personFor(key),
    opened: daysBack(between(key, 0, 18)),
    status: i < 4 ? "open" : i < 6 ? "reviewing" : "resolved",
  };
});

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Sales by period, in cents. Move-in and move-out weeks carry the year. */
export function salesSeries(period: Period) {
  if (period === "weekly") {
    return {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      values: [184000, 212000, 169000, 243000, 318000, 402000, 286000],
    };
  }
  if (period === "yearly") {
    return { labels: ["2023", "2024", "2025", "2026"], values: [1420000, 3870000, 7240000, 11960000] };
  }
  return {
    labels: MONTHS,
    values: [
      412000, 356000, 488000, 521000, 946000, 604000, 398000, 1284000, 1172000, 736000, 1042000, 688000,
    ],
  };
}

export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

export const moneyExact = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact" }).format(n);

/** Revenue leaders, used by the top-selling table and the category chart. */
export function topSellers(rows: InventoryRow[], count = 5) {
  return [...rows]
    .map((r) => ({ ...r, revenue: r.sold * r.price_cents }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, count);
}

export function categoryBreakdown(rows: InventoryRow[]) {
  return CATEGORIES.map(([key]) => {
    const inCat = rows.filter((r) => r.category === key);
    return {
      key,
      name: label(CATEGORIES, key),
      listings: inCat.length,
      revenue: inCat.reduce((sum, r) => sum + r.sold * r.price_cents, 0),
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

export function orderMix(orders: OrderRow[]) {
  const count = (s: OrderRow["status"]) => orders.filter((o) => o.status === s).length;
  return [
    { name: "Completed", value: count("completed"), color: "#00A9E0" },
    { name: "Awaiting pickup", value: count("awaiting pickup"), color: "#004165" },
    { name: "Processing", value: count("processing"), color: "#7cc6e8" },
    { name: "Cancelled", value: count("cancelled"), color: "#cbd5e1" },
    { name: "Refunded", value: count("refunded"), color: "#f0b429" },
  ].filter((s) => s.value > 0);
}

export function channelMix(orders: OrderRow[]) {
  const colors: Record<string, string> = {
    Search: "#00A9E0",
    Direct: "#004165",
    "Campus link": "#7cc6e8",
    Referral: "#f0b429",
  };
  return CHANNELS.map((c) => ({
    name: c,
    value: orders.filter((o) => o.channel === c).length,
    color: colors[c],
  }));
}

export const CAMPAIGNS = [
  { name: "Move-out week posters", reach: 4200, clicks: 318 },
  { name: "Welcome week table", reach: 2600, clicks: 274 },
  { name: "Residence hall email", reach: 5100, clicks: 229 },
  { name: "Student senate post", reach: 1800, clicks: 141 },
  { name: "Library screens", reach: 3300, clicks: 96 },
];

export const revenueOf = (orders: OrderRow[]) =>
  orders.filter((o) => o.status === "completed").reduce((sum, o) => sum + o.amount_cents, 0);

/** A live product row from Supabase, shaped like the rest of the board. */
export function inventoryFromProduct(p: Product): InventoryRow {
  return {
    id: p.id,
    title: p.title,
    category: p.category,
    price_cents: p.price_cents,
    stock: p.status === "active" ? 1 : 0,
    sold: p.status === "sold" ? 1 : 0,
    campus: p.campus,
    source: "student",
    status: p.status === "active" ? "published" : p.status === "sold" ? "unpublished" : "archived",
    updated: p.created_at,
  };
}
