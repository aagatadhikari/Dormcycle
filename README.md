# DormCycle

**Don't toss it. Keep it going.** A student-to-student marketplace for dorm essentials, useful finds, and convenient campus handoffs.

Live site: https://dormcycle.vercel.app

## What works
- Browse, search and filter listings (category, campus, condition, max price, sort)
- Sign up / log in
- Sell: list an item with up to 8 photos, mark it sold, relist or delete it
- Buy: tells the seller you want the item and opens a chat to arrange a campus handoff
- Messages: a pop-up chat between buyers and sellers with live updates and read receipts

Online payment (Stripe) and the admin dashboard are not part of this version yet.

## Tech
Next.js, TypeScript, Tailwind CSS, Supabase (auth, database, storage, realtime). The Supabase URL and publishable key in `lib/supabase.ts` are public values; access is controlled by Row Level Security in the database. No secret keys belong in this repository.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

Example listing photos are from Unsplash. Brand colors follow the DormCycle brand sheet.
