# DormCycle Product Plan

This file records the product decisions and demo scope agreed in the Codex conversation. Read it before changing product flows or data models. Update it when the owner makes a new decision.

## Product goal

DormCycle is a school-operated campus marketplace. Students can sell items to one another or donate eligible items to the school. Student workers handle donation handoffs and pickups. The school stores, prices, and resells donated items at affordable prices. DormCycle provides the software and earns a commission on sales.

The current work is a demo, not a production launch. The project owner is the school's contact for this demo.

## Agreed product decisions

### Users and access

- Only people with an email from the participating school may use the program.
- A school administrator manages the program through DormCycle.
- Student workers are school-authorized users with operational permissions. Email-domain verification alone must not grant worker or administrator access.
- Students use the marketplace, manage their listings and profile, contact the office, and review their transactions.
- The demo owner acts as the school administrator and office contact.
- The participating school's exact email domain and production verification method are still to be supplied.

### Student-to-student sales

- A student may list an item for sale and set its item price.
- Buyers may choose **Buy now** when the seller enables it, or request a meetup.
- A pending meetup request does not reserve the listing.
- When the seller accepts a meetup request, reserve the listing for that buyer through the meetup window.
- At the meetup, the buyer can inspect or test the item. The parties must agree to proceed. The buyer then pays digitally through Stripe.
- If the meetup window expires without payment, release the reservation and make the listing available again.
- A completed sale changes the listing to sold and appears in transaction history.

### Donations and school resale

- Students can donate eligible items for the school to resell.
- The school does not accept clothing or items that do not work. These rules apply to school donations. Rules for student-to-student listings have not been set.
- Donation handoff options:
  - **Scheduled handoff:** the student brings the item to a school-designated location during an available time window and hands it to a student worker.
  - **Small-item drop-off:** the student drops the item at a designated office or drop-off area. A worker records receipt.
  - **Heavy-item dorm pickup:** for items such as sofas, workers come to the dorm to help collect the item. The student supplies access and scheduling details.
- The school chooses its locations, such as Tunheim Classroom Building, the Trojan Center, or East Hall. It allocates storage space and manages pickup capacity and worker assignments.
- Student workers record intake and condition, then move accepted items to school storage.
- The school sets the resale price at 50% to 90% below the item's estimated used value. For example, an item estimated at $100 in used value would be priced from $10 to $50.
- School resale listings identify the school as the seller and include a buyer handoff or pickup location.
- The school uses net resale proceeds to support student worker costs and program operations.

### Digital payments and fees

- All completed purchases use Stripe. The demo should use Stripe test mode and must not collect real card details or move live money.
- Sellers can enable immediate purchase. A buyer who requests a meetup pays through Stripe after inspection and mutual agreement.
- DormCycle takes a 3% commission on every completed sale, including student-to-student sales and school resales. The commission is calculated from the item's listed price, before the Stripe processing fee.
- The buyer pays the Stripe processing fee. Show one all-in amount in the marketplace before the buyer commits, with a clear checkout breakdown of the item price, processing fee, and total.
- The seller's proceeds are the item price less the 3% DormCycle commission. The processing fee is passed through to the buyer as part of the buyer's all-in total.
- Use the Stripe account's configured processing fees when calculating the buyer total. Do not hardcode a fee rate. The exact fee calculation and payment-method support must be verified when connecting the Stripe sandbox.
- Student payout setup and payment history belong in Settings. School resale proceeds go to the school's configured Stripe account. The app tracks sale proceeds and fees. Student worker payroll remains the school's responsibility.

### Settings and office contact

Settings should contain:
- Profile
- Transaction history
- Banking or payout information
- Contact the office, with a conversation thread students can use and administrators can reply to
- Log out

Office conversations need to be associated with the appropriate school and visible to its authorized administrators.

## Demo scope

Build a coherent, navigable single-school demo that can show these journeys:

1. A student lists an item, a buyer completes Buy now in Stripe test mode, and both sides can view the transaction and fee breakdown.
2. A buyer requests a meetup, the seller accepts, the listing is reserved through the meetup window, and the buyer completes or declines the purchase after inspecting the item.
3. A student schedules a donation handoff, small-item drop-off, or heavy-item pickup. A student worker sees or receives the assignment and records intake. The administrator prices and publishes the item for school resale.
4. A buyer purchases a school listing and the administrator can review the transaction and net proceeds.
5. A student contacts the office and the administrator replies.

Seeded demo accounts or a clearly labeled role switch can demonstrate student, student-worker, and administrator screens. Keep role changes clearly marked as demo functionality. Use Stripe test mode when credentials are available. Until then, a clearly labeled payment simulation may exercise the screens and state transitions without collecting payment information.

Use one sample school for the demo. Dakota State University and the example locations have come up in discussion, but DSU has not yet been confirmed as the selected school or email domain.

## Suggested build sequence

1. Establish the shared app navigation and demo access for student, student-worker, and administrator roles.
2. Build the marketplace, listing details, item creation, and student seller controls.
3. Implement Buy now and meetup request/accept/expiry states, with consistent transaction and price breakdowns.
4. Build donation scheduling, designated locations, worker check-in, heavy-item pickup assignments, storage intake, and school resale publishing.
5. Complete Settings, payout-history views, and the office conversation/reply workflow.
6. Connect persistence, school email verification, and Stripe Connect after the demo flows are clear and the required school and Stripe configuration is available.

## Current repository status and starting point

- app/page.tsx is the original sample marketplace landing page. Its navigation now links to Settings.
- app/settings/page.tsx is an initial browser-local Settings prototype. It has student and administrator demo views, editable profile fields, placeholder transaction and banking sections, log out, and a local office conversation/reply flow.
- The Settings prototype uses browser local storage. Its conversations are not shared across devices or users.
- The project currently has no real authentication, database, listing workflow, donation workflow, worker dashboard, or Stripe integration.
- Preserve the existing Next.js guidance in AGENTS.md. Read the installed Next.js documentation before changing Next.js code as that file directs.

## Decisions still needed before a production pilot

- Confirm the participating school, approved email domain, and email verification method.
- Decide the school's final list of donation categories and item-condition rules. Student resale restrictions remain unspecified.
- Decide who estimates used value and how administrators choose a markdown within the agreed 50% to 90% range.
- Configure Stripe Connect account ownership and onboarding for each school's proceeds and each student's seller payouts.
- Verify payment-method fee calculation, refunds, disputes, and cancellation handling before live payments.
- Set exact meetup and donation time-window durations, location capacity, rescheduling rules, and worker notification process.
- Choose persistent hosting and a database before using the app with real school accounts.
