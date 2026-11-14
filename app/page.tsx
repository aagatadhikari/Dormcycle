import Link from "next/link";

const categories = ["Furniture", "Electronics", "Textbooks", "Clothing", "Kitchen", "Free"];

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-6 md:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <Link href="/" className="text-2xl font-black tracking-tight text-emerald-950">DormCycle<span className="text-emerald-600">.</span></Link>
        <form className="order-3 w-full md:order-none md:w-2/5">
          <input aria-label="Search listings" placeholder="Search furniture, books, electronics..." className="w-full rounded-full border border-stone-300 bg-white px-5 py-3 outline-none focus:border-emerald-700" />
        </form>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/messages">Messages</Link>
          <Link href="/login">Log in</Link>
          <Link href="/sell" className="rounded-full bg-emerald-800 px-5 py-2.5 text-white">Sell an item</Link>
        </nav>
      </header>

      <section className="py-14">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">The campus marketplace</p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">Give your dorm essentials a <span className="text-emerald-700">second life.</span></h1>
        <p className="mt-5 max-w-2xl text-lg text-stone-600">Buy and sell the things students need, right in your university community.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/products" className="rounded-full bg-emerald-800 px-6 py-3 font-semibold text-white">Explore listings</Link>
          <Link href="/sell" className="rounded-full border border-stone-300 bg-white px-6 py-3 font-semibold">Start selling</Link>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div><p className="text-sm text-stone-500">Browse by</p><h2 className="text-2xl font-bold">Categories</h2></div>
          <Link href="/products" className="text-sm font-semibold text-emerald-800">View all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {categories.map((category) => <Link key={category} href={`/products?category=${category.toLowerCase()}`} className="rounded-2xl border border-stone-200 bg-white p-5 text-center font-semibold shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-700">{category}</Link>)}
        </div>
      </section>

      <section className="mt-14 rounded-3xl bg-emerald-950 p-8 text-white md:p-12">
        <h2 className="text-3xl font-bold">Moving out? Moving in?</h2>
        <p className="mt-3 max-w-xl text-emerald-100">List what you no longer need, find affordable dorm essentials, and message other students directly.</p>
        <Link href="/sell" className="mt-6 inline-block rounded-full bg-white px-6 py-3 font-semibold text-emerald-950">List an item</Link>
      </section>
      <footer className="mt-16 border-t border-stone-200 py-7 text-sm text-stone-500">© {new Date().getFullYear()} DormCycle. Built for campus communities.</footer>
    </main>
  );
}
