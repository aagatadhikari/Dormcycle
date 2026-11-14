# DormCycle starter

This is a **starter scaffold**, not a finished or production-ready marketplace. It includes a Next.js app shell, initial routes, Supabase client helpers, a 5% fee helper, and a starter SQL schema.

## Requirements
- Node.js 20.9 or newer (use a currently supported LTS release)
- npm
- Visual Studio Code (recommended)
- Git (recommended)

## Run locally
1. Extract this ZIP.
2. Open the extracted `dormcycle-starter` folder in VS Code.
3. Open Terminal in VS Code.
4. Run:

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, if `cp` does not work, use:

```powershell
Copy-Item .env.example .env.local
```

5. Open http://localhost:3000.

## Supabase next step
1. Create a project at https://supabase.com/dashboard.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Copy the Project URL and anon/public key into `.env.local`.
4. Create a Storage bucket named `product-images`.
5. Configure and test Storage policies before allowing uploads.

Do not put the Supabase service-role key in browser code. Keep it server-side only.

## Stripe next step
Create/configure Stripe only with an eligible adult/legal representative where required. Begin in Stripe test mode. The 5% fee helper is in `lib/stripe.ts`, but checkout, Connect onboarding, transfers, webhooks, refunds, and payouts still need to be implemented and tested against the actual Stripe account configuration.

Never paste secret keys into chat or commit them to Git. Enter them only in your local `.env.local` and deployment secret settings.

## Current limitations
- Signup/login forms are UI placeholders, not connected to Supabase Auth yet.
- Product list and Sell page are UI placeholders, not yet connected to database/storage.
- Messages page is a placeholder; realtime chat UI and event subscriptions still need implementation.
- Admin page is a placeholder; it is not yet access-controlled. Do not deploy it as an operational admin dashboard.
- Stripe checkout, Connect onboarding, webhook handling, refunds, and payouts are not yet implemented.
- The SQL is an initial schema/policy draft. Review and test all policies, especially admin access, profile visibility, product updates, Storage, orders, and payments before launch.

## Project decisions
- University verification is skipped for the initial version.
- DormCycle platform commission: 5%.
- Stripe Connect is the intended seller payout system.
- Supabase Realtime is the intended messaging system.
