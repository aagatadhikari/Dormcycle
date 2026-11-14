export type Product = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price_cents: number;
  category: string;
  condition: string;
  campus: string;
  pickup_location: string;
  status: "active" | "sold" | "removed";
  created_at: string;
  product_images?: { storage_path: string; sort_order: number }[];
  example?: { image: string };
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
  read_at: string | null;
};

export const CATEGORIES: [string, string][] = [
  ["furniture", "Furniture"],
  ["electronics", "Electronics"],
  ["textbooks", "Textbooks"],
  ["clothing", "Clothing"],
  ["kitchen", "Kitchen"],
  ["other", "Other"],
];

export const CONDITIONS: [string, string][] = [
  ["new", "New"],
  ["like_new", "Like new"],
  ["good", "Good"],
  ["fair", "Fair"],
];

export const CAMPUSES = [
  "Dakota State University",
  "University of South Dakota",
  "South Dakota State University",
  "South Dakota Mines",
  "Other campus",
];

export const label = (pairs: [string, string][], key: string) => pairs.find(([k]) => k === key)?.[1] ?? key;

export const price = (cents: number) =>
  cents === 0 ? "Free" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const photo = (id: string) => `https://images.unsplash.com/${id}?w=640&q=70&auto=format&fit=crop`;

const ex = (
  n: number,
  title: string,
  dollars: number,
  category: string,
  condition: string,
  pickup: string,
  img: string,
  description: string,
): Product => ({
  id: `example-${n}`,
  seller_id: "",
  title,
  description,
  price_cents: dollars * 100,
  category,
  condition,
  campus: "Dakota State University",
  pickup_location: pickup,
  status: "active",
  created_at: "2026-11-01T12:00:00Z",
  example: { image: photo(img) },
});

// Example listings (photos from Unsplash) so the page shows what DormCycle looks like while it fills up.
export const EXAMPLES: Product[] = [
  ex(1, "Mini fridge", 60, "kitchen", "good", "Dorm lobby", "photo-1540961403310-79825242906e", "Compact fridge that fits under a lofted bed. Cold, clean, and ready for the semester."),
  ex(2, "Desk lamp", 12, "furniture", "like_new", "Library steps", "photo-1519219788971-8d9797e0928e", "Adjustable arm lamp. Great for late-night studying."),
  ex(3, "Study chair", 25, "furniture", "good", "Student union", "photo-1579487785973-74d2ca7abdd5", "Sturdy chair, comfortable for long study sessions."),
  ex(4, "Textbook bundle", 40, "textbooks", "good", "Library steps", "photo-1495446815901-a7297e633e8d", "A stack of gen-ed textbooks. Some highlighting, all pages intact."),
  ex(5, "Microwave", 30, "kitchen", "good", "Dorm lobby", "photo-1585659722983-3a675dabf23d", "Works perfectly. Moving off campus and can't take it."),
  ex(6, "Wireless headphones", 35, "electronics", "like_new", "Student union", "photo-1505740420928-5e560c06d30e", "Barely used, includes the charging cable."),
  ex(7, "Bookshelf", 20, "furniture", "fair", "Dorm lobby", "photo-1593430980369-68efc5a5eb34", "Wooden shelf, a few scuffs, very solid."),
  ex(8, "Hoodie", 0, "clothing", "good", "Student union", "photo-1620799140188-3b2a02fd9a77", "Free to a good home. Size M."),
];
