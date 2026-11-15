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

const CAMPUS_BY_INDEX = [CAMPUSES[0], CAMPUSES[1], CAMPUSES[2]];

const day = 24 * 60 * 60 * 1000;
const listedAt = (daysAgo: number) => new Date(Date.UTC(2026, 10, 14) - daysAgo * day).toISOString();

const ex = (
  n: number,
  title: string,
  dollars: number,
  category: string,
  condition: string,
  pickup: string,
  img: string,
  daysAgo: number,
  campusIndex: number,
  description: string,
): Product => ({
  id: `listing-${n}`,
  seller_id: "",
  title,
  description,
  price_cents: dollars * 100,
  category,
  condition,
  campus: CAMPUS_BY_INDEX[campusIndex],
  pickup_location: pickup,
  status: "active",
  created_at: listedAt(daysAgo),
  example: { image: photo(img) },
});

export const CATALOG: Product[] = [
  ex(1, "Mini fridge", 60, "kitchen", "good", "Dorm lobby", "photo-1540961403310-79825242906e", 2, 0, "Compact fridge that fits under a lofted bed. Cold, clean, and ready for the semester."),
  ex(2, "Desk lamp", 12, "furniture", "like_new", "Library steps", "photo-1519219788971-8d9797e0928e", 3, 0, "Adjustable arm lamp. Great for late-night studying."),
  ex(3, "Study chair", 25, "furniture", "good", "Student union", "photo-1579487785973-74d2ca7abdd5", 1, 0, "Sturdy chair, comfortable for long study sessions."),
  ex(4, "Textbook bundle", 40, "textbooks", "good", "Library steps", "photo-1495446815901-a7297e633e8d", 4, 0, "A stack of gen-ed textbooks. Some highlighting, all pages intact."),
  ex(5, "Microwave", 30, "kitchen", "good", "Dorm lobby", "photo-1585659722983-3a675dabf23d", 5, 0, "Works perfectly. Moving off campus and can't take it."),
  ex(6, "Wireless headphones", 35, "electronics", "like_new", "Student union", "photo-1505740420928-5e560c06d30e", 2, 0, "Barely used, includes the charging cable."),
  ex(7, "Bookshelf", 20, "furniture", "fair", "Dorm lobby", "photo-1593430980369-68efc5a5eb34", 6, 0, "Wooden shelf, a few scuffs, very solid."),
  ex(8, "Grey hoodie", 0, "clothing", "good", "Student union", "photo-1620799140188-3b2a02fd9a77", 1, 0, "Free to a good home. Size M."),
  ex(9, "Desk chair on wheels", 30, "furniture", "good", "Residence hall lobby", "photo-1594235048794-fae8583a5af5", 3, 0, "Rolling desk chair, height adjustable. Rolls smooth, no rips in the seat."),
  ex(10, "Electric kettle", 15, "kitchen", "like_new", "Dorm lobby", "photo-1594213114663-d94db9b17125", 2, 0, "Stainless kettle, boils in two minutes. Perfect for ramen and tea runs."),
  ex(11, "Coffee maker", 18, "kitchen", "good", "Student union", "photo-1650940925927-f4a30c930a4d", 7, 0, "Single-pot coffee maker with the carafe. Kept me alive through finals."),
  ex(12, "Everyday backpack", 22, "other", "like_new", "Library steps", "photo-1622560480654-d96214fdc887", 1, 0, "Roomy backpack with a padded laptop sleeve. Zippers all work."),
  ex(13, "Campus bike", 85, "other", "good", "Bike rack by the quad", "photo-1505705694340-019e1e335916", 4, 0, "Single speed, great for getting across campus. Tires just replaced."),
  ex(14, "24-inch monitor", 55, "electronics", "good", "Residence hall lobby", "photo-1611648694931-1aeda329f9da", 2, 0, "Second screen that doubled my study speed. HDMI cable included."),
  ex(15, "Keyboard and mouse", 20, "electronics", "good", "Student union", "photo-1551739440-5dd934d3a94a", 5, 0, "Wireless set with the USB receiver. Keys are all intact."),
  ex(16, "String lights", 0, "other", "good", "Dorm lobby", "photo-1768077712695-25e3a69b4dc7", 1, 0, "Warm string lights that made my room feel less like a cinder block. Free to whoever wants them."),
  ex(17, "Pillow set", 10, "other", "good", "Residence hall lobby", "photo-1628746234641-28eb583a51b4", 8, 0, "Two pillows, freshly washed covers. Spare set for when friends crash."),
  ex(18, "Wooden stools", 16, "furniture", "fair", "Campus green", "photo-1772944780860-e99bd902d59a", 9, 0, "Pair of small stools. Extra seating when your room becomes the hangout."),
  ex(19, "Twin XL comforter", 14, "other", "good", "Dorm lobby", "photo-1616486232086-81d47190669a", 3, 0, "Twin XL comforter, warm and clean. Fits the standard dorm bed."),
  ex(20, "Campus tee", 0, "clothing", "good", "Student union", "photo-1759366761826-112ce26596a1", 2, 0, "Size L tee, barely worn. Free, just take it."),
  ex(21, "Padded office chair", 35, "furniture", "like_new", "Residence hall lobby", "photo-1688578735427-994ecdea3ea4", 6, 1, "Bought it for online classes, barely sat in it. Lumbar support is still firm."),
  ex(22, "Wooden chair with cushion", 18, "furniture", "good", "Campus green", "photo-1774294067819-91abcd349372", 11, 0, "Simple wooden chair, washable cushion. Fits in a corner without crowding the room."),
  ex(23, "Desk with lamp corner", 45, "furniture", "good", "Dorm lobby", "photo-1761323612470-b8de857169e1", 10, 0, "Small writing desk, perfect under a window. Lamp goes with it."),
  ex(24, "Grey task chair", 28, "furniture", "good", "Library steps", "photo-1688578735352-9a6f2ac3b70a", 7, 2, "Rolls quietly, adjusts high enough for a lofted setup."),
  ex(25, "Side table", 12, "furniture", "fair", "Student union", "photo-1579356687668-cbdd5a551c18", 13, 0, "Brown wooden table, scratches on top but rock solid."),
  ex(26, "Green seat desk chair", 32, "furniture", "like_new", "Residence hall lobby", "photo-1750306957820-f778b67c4e13", 4, 0, "Modern chair with a green seat. Adds some color to a beige room."),
  ex(27, "Accent chair", 24, "furniture", "good", "Dorm lobby", "photo-1658046157320-36577125b29b", 12, 1, "Comfy reading chair. Heavier than it looks, bring a friend."),
  ex(28, "Spare dining chairs", 20, "furniture", "good", "Campus green", "photo-1572521165329-b197f9ea3da6", 14, 0, "Two matching chairs. Good for a kitchen table or extra seating."),
  ex(29, "White desk chair", 26, "furniture", "good", "Student union", "photo-1688578735122-f37256f1b8b0", 9, 0, "Clean white chair, wheels replaced last spring."),
  ex(30, "Laptop, older model", 180, "electronics", "fair", "Library steps", "photo-1555930112-0159bcdc3fe5", 5, 0, "Runs fine for notes and browsing. Battery holds about three hours."),
  ex(31, "All-in-one desktop", 220, "electronics", "good", "Residence hall lobby", "photo-1494173853739-c21f58b16055", 8, 2, "Big screen, everything built in. Great if your desk is small."),
  ex(32, "Desktop computer setup", 260, "electronics", "good", "Dorm lobby", "photo-1527443224154-c4a3942d3acf", 11, 0, "Screen, keyboard and mouse together. Wiped and ready for a new owner."),
  ex(33, "Monitor with stand", 48, "electronics", "like_new", "Student union", "photo-1666771410140-0573b232426e", 3, 0, "White monitor, adjustable stand. No dead pixels."),
  ex(34, "Gaming monitor and controllers", 90, "electronics", "good", "Residence hall lobby", "photo-1587831990711-23ca6441447b", 6, 0, "Monitor plus two controllers. Carried a lot of late-night tournaments."),
  ex(35, "Compact laptop", 140, "electronics", "fair", "Library steps", "photo-1585792180666-f7347c490ee2", 15, 1, "Light enough to carry all day. Charger included."),
  ex(36, "Flat screen and keyboard", 60, "electronics", "good", "Dorm lobby", "photo-1547658718-1cdaa0852790", 10, 0, "Screen and keyboard as a set. Both work, cables included."),
  ex(37, "Desk speaker setup", 25, "electronics", "good", "Student union", "photo-1764588029885-d115de3bda1e", 7, 0, "Small desk speakers with the cables. Loud enough for a dorm room."),
  ex(38, "Intro psychology textbook", 25, "textbooks", "good", "Library steps", "photo-1610116306796-6fea9f4fae38", 2, 0, "Current edition, a little highlighting in the first chapters."),
  ex(39, "Biology textbook", 35, "textbooks", "good", "Student union", "photo-1497633762265-9d179a990aa6", 4, 0, "Heavy but clean. Saves you a hundred at the bookstore."),
  ex(40, "Business course books", 45, "textbooks", "good", "Library steps", "photo-1550399105-c4db5fb85c18", 9, 2, "Three books from the intro business sequence. All current editions."),
  ex(41, "Stack of novels", 10, "textbooks", "good", "Campus green", "photo-1512820790803-83ca734da794", 6, 0, "Lit class leftovers. Take the whole stack."),
  ex(42, "Math and stats books", 30, "textbooks", "fair", "Dorm lobby", "photo-1519682337058-a94d519337bc", 12, 0, "Spines are worn, pages are fine. Worked through most of the problem sets."),
  ex(43, "Reference shelf", 20, "textbooks", "good", "Library steps", "photo-1524578271613-d550eacf6090", 13, 1, "Assorted reference books. Pick what you need, take the rest free."),
  ex(44, "Study guides", 0, "textbooks", "good", "Student union", "photo-1694730750153-8b66cf3dd014", 1, 0, "Free. Someone else may as well get use out of them."),
  ex(45, "Tea kettle", 10, "kitchen", "good", "Dorm lobby", "photo-1571552879083-e93b6ea70d1d", 5, 0, "White stovetop kettle. Nothing fancy, works every time."),
  ex(46, "Cooking pot set", 28, "kitchen", "good", "Residence hall lobby", "photo-1584990347193-6bebebfeaeee", 8, 0, "Three stainless pots. The only reason I ate real food last year."),
  ex(47, "Frying pan", 12, "kitchen", "good", "Student union", "photo-1518291344630-4857135fb581", 3, 0, "Non-stick pan, coating still good. Handles eggs and stir fry."),
  ex(48, "Dish set", 16, "kitchen", "like_new", "Campus green", "photo-1556910585-09baa3a3998e", 10, 0, "Plates and bowls for four. No chips."),
  ex(49, "Puffer jacket", 40, "clothing", "like_new", "Dorm lobby", "photo-1706765779494-2705542ebe74", 2, 0, "Warm enough for a South Dakota January. Size M, no tears."),
  ex(50, "Blue zip hoodie", 15, "clothing", "good", "Student union", "photo-1624548140129-74786c5f1279", 4, 0, "Soft zip-up, size L. Washed and ready."),
  ex(51, "Running shoes", 30, "clothing", "good", "Campus green", "photo-1600185365483-26d7a4cc7519", 6, 0, "Size 10, maybe forty miles on them. Tread is still deep."),
  ex(52, "White sneakers", 25, "clothing", "like_new", "Library steps", "photo-1560769629-975ec94e6a86", 7, 1, "Size 9, worn twice. Box included."),
  ex(53, "Hiking backpack", 45, "other", "good", "Residence hall lobby", "photo-1509762774605-f07235a08f1f", 11, 0, "Big pack with a frame. Took it to the Hills a few times."),
  ex(54, "Mountain bike", 120, "other", "good", "Bike rack by the quad", "photo-1618762044398-ec1e7e048bbd", 5, 2, "Trail bike with fresh brake pads. Rides smooth on gravel."),
  ex(55, "Room decor bundle", 0, "other", "good", "Dorm lobby", "photo-1564273795917-fe399b763988", 1, 0, "Posters, a small plant pot, odds and ends. Free, saves you a trip to the store."),
  ex(56, "Bed risers and storage", 14, "other", "good", "Student union", "photo-1463620910506-d0458143143e", 9, 0, "Risers plus two under-bed bins. Doubles your closet space."),
];
