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
  ex(9, "Desk chair on wheels", 30, "furniture", "good", "Residence hall lobby", "photo-1594235048794-fae8583a5af5", "Rolling desk chair, height adjustable. Rolls smooth, no rips in the seat."),
  ex(10, "Electric kettle", 15, "kitchen", "like_new", "Dorm lobby", "photo-1594213114663-d94db9b17125", "Stainless kettle, boils in two minutes. Perfect for ramen and tea runs."),
  ex(11, "Coffee maker", 18, "kitchen", "good", "Student union", "photo-1650940925927-f4a30c930a4d", "Single-pot coffee maker with the carafe. Kept me alive through finals."),
  ex(12, "Everyday backpack", 22, "other", "like_new", "Library steps", "photo-1622560480654-d96214fdc887", "Roomy backpack with a padded laptop sleeve. Zippers all work."),
  ex(13, "Campus bike", 85, "other", "good", "Bike rack by the quad", "photo-1505705694340-019e1e335916", "Single speed, great for getting across campus. Tires just replaced."),
  ex(14, "24-inch monitor", 55, "electronics", "good", "Residence hall lobby", "photo-1611648694931-1aeda329f9da", "Second screen that doubled my study speed. HDMI cable included."),
  ex(15, "Keyboard and mouse", 20, "electronics", "good", "Student union", "photo-1551739440-5dd934d3a94a", "Wireless set with the USB receiver. Keys are all intact."),
  ex(16, "String lights", 0, "other", "good", "Dorm lobby", "photo-1768077712695-25e3a69b4dc7", "Warm string lights that made my room feel less like a cinder block. Free to whoever wants them."),
  ex(17, "Pillow set", 10, "other", "good", "Residence hall lobby", "photo-1628746234641-28eb583a51b4", "Two pillows, freshly washed covers. Spare set for when friends crash."),
  ex(18, "Wooden stools", 16, "furniture", "fair", "Campus green", "photo-1772944780860-e99bd902d59a", "Pair of small stools. Extra seating when your room becomes the hangout."),
  ex(19, "Twin comforter", 14, "other", "good", "Dorm lobby", "photo-1616486232086-81d47190669a", "Twin XL comforter, warm and clean. Fits the standard dorm bed."),
  ex(20, "Campus tee", 0, "clothing", "good", "Student union", "photo-1759366761826-112ce26596a1", "Size L tee, barely worn. Free, just take it."),
];
