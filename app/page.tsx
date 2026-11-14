import Link from "next/link";

const NAV = ["Home", "Notifications", "Messages"];

const CATEGORIES = ["All items", "Furniture", "Electronics", "Textbooks", "Clothing", "Kitchen", "Free items", "Other"];

const CAMPUSES = ["All campuses", "Dakota State University", "University of South Dakota", "South Dakota State University"];

// Sample items shown until real listings are connected.
const SAMPLE_ITEMS = [
  { icon: "🪑", title: "Desk chair", price: "$25", condition: "Good", place: "Library steps" },
  { icon: "📚", title: "Calculus textbook", price: "$40", condition: "Like new", place: "Student union" },
  { icon: "🧊", title: "Mini fridge", price: "$60", condition: "Good", place: "Dorm lobby" },
  { icon: "💡", title: "Desk lamp", price: "Free", condition: "Fair", place: "Dorm lobby" },
  { icon: "🎧", title: "Wireless headphones", price: "$35", condition: "Like new", place: "Student union" },
  { icon: "🧥", title: "Winter jacket", price: "$30", condition: "Good", place: "Library steps" },
  { icon: "🍳", title: "Cookware set", price: "$20", condition: "Good", place: "Dorm lobby" },
  { icon: "🖥️", title: "24-inch monitor", price: "$75", condition: "Like new", place: "Student union" },
];

const STEPS = [
  { title: "List it", body: "Snap a few photos, set a price, and pick a campus pickup spot." },
  { title: "Chat", body: "Buyers message you in real time, right from the listing." },
  { title: "Get paid", body: "Secure online checkout, then hand the item off on campus." },
];

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <a href="#" className="text-xl font-extrabold tracking-tight text-brand">
            Dorm<span className="text-slate-900">Cycle</span>
          </a>
          <input
            placeholder="Search items, descriptions, categories…"
            aria-label="Search"
            className="input order-last sm:order-none sm:max-w-md sm:flex-1"
          />
          <nav className="ml-auto flex flex-wrap items-center gap-1">
            {NAV.map((n) => (
              <a key={n} href="#" className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                {n}
              </a>
            ))}
            <Link href="/settings" className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Settings
            </Link>
            <a href="#" className="btn btn-primary">Sell</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6">
        <section className="rounded-2xl bg-gradient-to-r from-brand to-violet-500 p-8 text-white">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Buy &amp; sell in your dorm community</h1>
          <p className="mt-2 max-w-xl text-white/90">
            Furniture, textbooks, electronics and more from students on your campus. List what you no longer need and find
            what you do.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="#items" className="btn bg-white text-brand hover:bg-slate-100">Browse items</a>
            <a href="#how" className="btn border border-white/60 text-white hover:bg-white/10">How it works</a>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((c, i) => (
            <span
              key={c}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium ${
                i === 0 ? "border-brand bg-brand text-white" : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {c}
            </span>
          ))}
          <select aria-label="Campus" className="input ml-auto !w-auto">
            {CAMPUSES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <section id="items" className="space-y-3">
          <p className="text-sm text-slate-500">Sample listings — real student listings are coming soon.</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {SAMPLE_ITEMS.map((item) => (
              <div key={item.title} className="card overflow-hidden">
                <div className="relative flex aspect-square items-center justify-center bg-slate-100 text-6xl">
                  <span aria-hidden>{item.icon}</span>
                  <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-lg text-slate-400 shadow">
                    ♡
                  </span>
                </div>
                <div className="space-y-1 p-3">
                  <p className="truncate text-sm font-semibold">{item.title}</p>
                  <p className="text-base font-bold text-brand">{item.price}</p>
                  <p className="truncate text-xs text-slate-500">{item.condition} · {item.place}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card p-5">
              <p className="text-sm font-bold text-brand">Step {i + 1}</p>
              <h2 className="mt-1 text-lg font-bold">{s.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{s.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} DormCycle · Meet in public campus spots
      </footer>
    </>
  );
}
