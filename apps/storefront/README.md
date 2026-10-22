# Libas-ul-Fakhar — Storefront (MVP slice)

Mobile-first fashion storefront and back office for **Libas-ul-Fakhar (لِباسُ الفخر)**, built against
`Libas-ul-Fakhar E-Commerce – BRD SRS v2.0.md` (repo root). Stack per BRD §5.2: Next.js 16 (App Router,
Cache Components), TypeScript, Tailwind v4 with brand design tokens.

## Run it

```bash
npm install
cp .env.example .env.local   # then set ADMIN_PASSWORD and AUTH_SECRET
npm run dev                   # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build && npm start` | Production build |
| `npm test` | Unit tests for pricing, coupons, shipping, order state machine, search, sale scheduling, product validation, CSV import/export (Node test runner) |
| `npm run lint` | ESLint |

Back office: `/admin` (password = `ADMIN_PASSWORD` in `.env.local`).

Test coupons: `WELCOME10` (10%, max Rs. 1,000, min Rs. 2,000), `FAKHAR500` (Rs. 500 off over Rs. 5,000), `FREESHIP`.

## What is built (BRD requirement IDs)

**Storefront**
- Home: hero, trust strip, department tiles, tabbed department rows (Sale/Eastern/Western/Accessories), new arrivals, shoppable lookbook, best sellers, recommended + recently viewed, sale countdown — FR-HOME-01…05, 06, 08
- Header: sticky, centred logo, mega menu (Eastern/Western/Accessories + featured), mobile drawer, predictive search overlay — FR-NAV-01, 02, 05
- Search: Roman-Urdu synonyms (kurti, qameez, shalwar, topi, shaadi…), typo tolerance, natural-language price ("black formal shirt under 3000"), no-results page, zero-result logging — FR-NAV-02, 03, 06 (in-process), 07
- Listing: filters (category, size, colour, price, fit, fabric, in-stock, on-sale), sort, load-more, all state in URL, canonical rules — FR-PLP-01…08
- Product page: gallery with hover-zoom/swipe, colour + size variants with sold-out sizes disabled, stock indicator, size guide (in/cm) + height/weight recommendation, delivery estimate by city, COD/returns info, back-in-stock alerts, pre-order flag, WhatsApp order deep-link, share, verified reviews, complete-the-look, related, sticky mobile add-to-bag, schema.org Product/Offer/Review — FR-PDP-01…14
- Cart: drawer + page, qty, remove, coupons, free-shipping bar, cross-sell, guest persistence — FR-CART-01…05, 08
- Checkout: guest, Pakistan address format, city dropdown, phone validation (03xx / +92), COD + bank transfer (cards/JazzCash/Easypaisa shown as coming soon), live stock re-check, idempotent order creation, rate limiting — FR-CHK-01…05, 07, 12
- Order confirmation, Track Your Order (order no. + phone), customer cancel before shipment — FR-ACC-07, §4A rules
- Customer accounts (`/account`): sign in with mobile OTP or Google; overview, order history with detail, cancel-before-shipping and “Buy again”; address book with default address; profile and marketing consent; data export (JSON) and account deletion; guest orders placed with the verified number appear automatically — FR-ACC-01…08
- Wishlist syncs to the account: merged on sign-in, kept in step afterwards, cleared from the device on sign-out
- Checkout when signed in: prefilled from the default address, choose a saved address, opt in to save a new one; orders are linked to the account. Guests are offered an account after ordering — FR-CHK-01, §4A
- Wishlist, policy/CMS pages, 404, sitemap, robots, PWA manifest, floating WhatsApp, newsletter with consent — FR-PRM-04, FR-WA-02, §4.10

**Back office (`/admin`)**
- Products (`/admin/products`): list with search and filters (department, status, sale state), create/edit with colours, sizes, a colour × size stock grid, SKUs (auto or manual), draft/active/archived status, live preview — FR-ADM-02, 03
- Sale scheduling: per-product sale price with start/end in Pakistan time; prices go live and revert on their own. Department/category-wide % sales with dates and one-click clear — FR-PRM-01, FR-ADM-13
- CSV import with validation preview (row-level errors, nothing written until confirmed, all-or-nothing) and CSV export that doubles as the import template — FR-ADM-02
- Audit log of product, price, sale, stock and import changes, shown on each product — FR-ADM-11
- Product photos: upload many at once (drag-and-drop or picker), per colour or shared by all colours, reorder by drag or ←/→ buttons, move between colours, alt text, 4:5 crop warnings. First photo of a colour is its main image, the second is the listing hover image. Placeholder art shows only where a colour has no photos — BRD 3.2 Imagery
- Dashboard: revenue, orders, AOV, COD vs prepaid, top products, low stock — FR-ADM-09
- Orders: filter by status, search, detail, status changes through the explicit state machine (illegal moves rejected), notes, history audit trail, WhatsApp customer — FR-ADM-05, §4.12
- Inventory: per-variant stock edit, low/out filter — FR-ADM-04

**Guarantees verified**
- Concurrent orders cannot oversell the last unit (writes are serialised); cancel/return restocks — Acceptance §9.3
- Same idempotency key never creates a second order — §9.5
- Prices are re-computed on the server; client totals are display only.
- Admin edits show on the storefront on the next request; scheduled sales take effect within about a minute.

## Architecture notes

```
src/lib/            domain logic (pure, unit-tested): catalog, pricing, orderStatus, search, filters, sizeGuide
src/lib/server/     server-only: store (orders/inventory), adminAuth, rateLimit
src/app/(shop)/     storefront routes        src/app/admin/   back office
src/app/api/        orders, cart/validate, newsletter, stock-alert
src/components/     UI (design tokens in src/app/globals.css)
```

- Money is integer paisa; formatted as `Rs. 2,499`. Admin forms and CSV use whole rupees.
- Products live in the data store (seeded from `src/lib/catalog.ts` on first run). Each product stores `basePrice` + optional `sale {price, startsAt, endsAt}`; the selling price is derived at read time (`src/lib/productPricing.ts`), so no job is needed to start or end a sale.
- The storefront reads products through `getCatalog()` (`src/lib/server/catalog.ts`): a `"use cache"` read tagged `catalog`, refreshed every minute and invalidated by admin edits, orders and cancellations. Checkout always re-prices and re-checks stock live.
- Photos: uploads go to `POST /api/admin/uploads` (admin only, one file per request, max 10 MB, JPEG/PNG/WebP, at least 500px on the short side). sharp re-encodes every upload to WebP (max 2000×2500), applies phone rotation and strips EXIF/GPS. Files are stored in `data/uploads/products/` and served from `/media/products/<id>.webp` with immutable caching; `next/image` resizes them to AVIF/WebP per device. Removing a photo deletes its file on save; uploads never saved to a product are deleted after 24 hours. CSV import/export leaves photos untouched.
- Accounts: sessions are random tokens in an httpOnly cookie (30 days), stored only as SHA-256 hashes. OTP codes are 6 digits, HMAC-hashed with `AUTH_SECRET`, valid 5 minutes, single use, max 5 wrong tries; sends are limited (30 s cooldown, 3 per 15 min per number, plus per-device limits). Without an SMS provider, OTP codes are written to the server log and, in development only, shown on the sign-in screen. The provider hook is `deliverOtp()` in `src/lib/server/customers.ts`.
- Google sign-in uses the OAuth authorization-code flow with PKCE and a state cookie. It appears only when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set; register `<NEXT_PUBLIC_SITE_URL>/api/auth/google/callback` as the redirect URI. Not yet exercised against real Google credentials.
- CSV format: one row per variant; see the column reference on `/admin/products/import`. Blank `stock` keeps current stock; blank `sku` is generated.
- Layout uses logical CSS properties (`ms-`, `ps-`, `start-`) so Urdu RTL can be enabled in Phase 2.
- Brand assets in `public/brand/` were extracted from the supplied logo (transparent lockup, Latin/Arabic-only, light variant, icons, ink-free texture).

## Placeholders to replace before launch

| Item | Where |
| --- | --- |
| Product photography (upload in admin; placeholder art until then) | Admin → Products → Photos |
| Photo storage on local disk | `src/lib/server/media.ts` → S3-compatible storage + CDN |
| Seed catalogue (41 products, used only for an empty store) | `src/lib/catalog.ts` |
| Order store (JSON file in `data/`) | `src/lib/server/store.ts` → PostgreSQL |
| WhatsApp number, phone, email, social, sale end date | `src/lib/site.ts`, `.env.local` |
| Bank/IBAN details | `src/app/(shop)/order/[number]/page.tsx` |
| Policy copy (draft, needs legal review) | `src/lib/pages.ts` |

## Not in this slice (next slices per BRD §6)

Card/JazzCash/Easypaisa gateways, SMS/WhatsApp OTP delivery, server-side cart sync across devices, admin customer list (FR-ADM-07), returns portal, courier booking + tracking sync,
SMS/WhatsApp/email providers (hook is `notify()` in the store), full RBAC + 2FA, product video,
category/menu management, CMS page editing,
returns portal, reviews submission, analytics/pixels, product feeds, Urdu content.
