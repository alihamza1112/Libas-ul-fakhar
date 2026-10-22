# Libas-ul-Fakhar E-Commerce Platform

**Business & Software Requirements Document (BRD/SRS) – Version 2.0 (Updated Draft)**

| Field | Detail |
| --- | --- |
| Brand | Libas-ul-Fakhar (لِباسُ الفخر) |
| Document version | 2.0 (supersedes v1.0 dated 11 Oct 2026) |
| Date | 21 October 2026 |
| Project type | B2C fashion e-commerce, mobile-first, PWA |
| Market | Pakistan (PKR, COD-first, WhatsApp-first) |
| Status | For stakeholder review |

## 0. What Changed in v2.0

1. **Brand identity added.** The store is now Libas-ul-Fakhar, with a design system derived from the supplied logo (Section 3). References to breakout.com.pk remain as layout inspiration only.
2. **Latest e-commerce features added** (Section 4): WhatsApp commerce, AI-assisted search and size help, server-side tracking, PWA, wallet/store credit, pre-orders, reviews with photos, returns portal, fraud controls, omnichannel stock, product feeds.
3. **Engineering approach added** (Sections 5 and 6): architecture, repository structure, environments, CI/CD, testing, security and observability for a production-grade build.
4. **Delivery changed from a single big build to thin vertical slices** (Section 6). No module is built in one prompt or one pass; each slice has a spec, contract, tests and a review gate.
5. **Bilingual readiness moved earlier.** Urdu/Arabic-script (RTL) content stays Phase 2, but the codebase is RTL-ready and i18n-ready from day one because the brand identity is Arabic calligraphy.
6. **Open questions list added** (Section 10), including product scope, since the brand name may cover more than western wear.

## 1. Introduction

### 1.1 Purpose

This document defines business, functional, non-functional, design, architectural and delivery requirements for the Libas-ul-Fakhar online store. It is the baseline for design, development, testing and acceptance.

### 1.2 Scope

**In scope (Phase 1 / MVP):** storefront, catalogue, search, cart, checkout, accounts, order tracking, returns, admin panel, inventory, promotions, payments, shipping, notifications, analytics, SEO, CMS.

**Out of scope (Phase 1):** native mobile apps, multi-vendor marketplace, loyalty app, virtual try-on. These sit in the Phase 2/3 roadmap.

### 1.3 Objectives

1. Sell apparel and accessories (departments to be confirmed, see Section 10) online across Pakistan.
2. Fast, clean, mobile-first experience; guest COD checkout in under 2 minutes.
3. Let non-technical staff manage products, prices, stock, sales, content and orders.
4. Handle seasonal sales (for example, Eid, Ramadan, Black Friday, Flat 50% OFF) without performance loss.
5. Be built as a maintainable, secure, observable system that can run in production from the first release.

### 1.4 Stakeholders

Business owner, marketing, operations/warehouse, customer support, developers, courier partners, payment providers, customers.

### 1.5 Definitions

SKU = stock keeping unit; COD = cash on delivery; PDP/PLP = product detail/listing page; CMS = content management system; PWA = progressive web app; RTL = right-to-left; ADR = architecture decision record; INP = Interaction to Next Paint.

## 2. Reference Site Analysis

Layout and flow inspiration comes from breakout.com.pk (observed 11 October 2026): department navigation, tabbed home rows, product cards with sale price, struck-through price, discount badge and size chips, slide-out cart, predictive search, account/wishlist, policy footer, PKR pricing. **No assets, copy or imagery are to be copied.** The new site uses its own brand, photography and content.

## 3. Brand & Design Requirements

### 3.1 Brand reading of the logo

The logo pairs black Arabic calligraphy (لِباسُ الفخر) with an elegant serif small-caps Latin wordmark "Libas-ul-Fakhar" over a soft, warm, painterly cream background. The tone is heritage, refined and premium rather than loud streetwear. v1.0's "urban/streetwear" direction is replaced by **"modern heritage, editorial, product-first"**.

### 3.2 Visual identity

| Element | Requirement |
| --- | --- |
| Palette | Warm neutral base: ivory/cream (sampled from logo background), white, near-black (#111111) for text and primary buttons. Support tones: sand and clay/rose-beige drawn from the brushstrokes. One accent reserved for sale badges and urgent states (muted brick red; contrast-checked). Final hex values to be sampled from the master logo file and approved. |
| Typography | Headings: refined serif (to pair with the logo wordmark). Body/UI: clean sans-serif, 2 weights. Arabic/Urdu: a Nastaliq or Naskh web font with proper line-height, ready for Phase 2. Base 16px, line height 1.5; Urdu 1.8+. |
| Logo usage | Provide SVG logo variants: full lockup, Latin-only, Arabic-only, monogram/favicon. Minimum sizes and clear-space rules documented. Logo must never sit on busy photography without a scrim. |
| Imagery | Portrait 4:5 product images, consistent warm-neutral background, 4-6 images per product, short product video optional, zoom on hover and pinch. Painterly texture from the logo background may be used sparingly for banners and the announcement bar. |
| Buttons | Solid near-black primary, outlined secondary, 2-4px radius. |
| Badges | Discount %, New, Sold out, Low stock, Pre-order. |
| Iconography | Single outline icon set (search, user, heart, bag, WhatsApp). |
| Motion | Subtle 150-250ms transitions; respects reduced-motion. |

### 3.3 Layout

- **Header:** centred logo, department menu, predictive search, account, wishlist, cart with count; sticky; announcement bar for sale and shipping messages.
- **Mega menu:** per department with Clothing and Accessories columns and a featured image.
- **Mobile:** hamburger drawer, thumb-friendly controls, sticky Add to Cart on PDP, floating WhatsApp button.
- **Grid:** 2 columns mobile, 3 tablet, 4 desktop.
- **Footer:** link groups, newsletter with consent, support contact, payment icons, social links.
- **Breakpoints:** 360, 768, 1024, 1440 px. More than 80% of expected traffic is mobile.
- **RTL-ready:** all layouts use logical CSS properties (start/end) so Urdu/Arabic can be enabled without redesign.

## 4. Functional Requirements

Priority: **M** = Must, **S** = Should, **C** = Could. Items marked **NEW** were added in v2.0; others are carried from v1.0 and kept unless noted.

### 4.1 Home Page

| ID | Requirement | Pri |
| --- | --- | --- |
| FR-HOME-01 | Hero banner/slider managed from admin (image, link, CTA, schedule) | M |
| FR-HOME-02 | Department tiles with "Shop Now" | M |
| FR-HOME-03 | Tabbed product rows per department (Sale / Top / Bottom / Accessories) | M |
| FR-HOME-04 | Dynamic New Arrivals, Best Sellers, Top Picks sections | M |
| FR-HOME-05 | Announcement bar and sale countdown | S |
| FR-HOME-06 | Lookbook / shoppable look section **NEW** | S |
| FR-HOME-07 | Social feed (Instagram/TikTok) section | C |
| FR-HOME-08 | Personalised "Recommended for you" and "Recently viewed" rows **NEW** | S |

### 4.2 Navigation & Search

| ID | Requirement | Pri |
| --- | --- | --- |
| FR-NAV-01 | Hierarchical menu: Department > Category > Sub-category | M |
| FR-NAV-02 | Predictive search: suggestions, thumbnails, typo tolerance, Roman-Urdu/Urdu synonyms (for example "kurta", "shalwar") **UPDATED** | M |
| FR-NAV-03 | Search results page with filters and sorting | M |
| FR-NAV-04 | Recently viewed products | S |
| FR-NAV-05 | Breadcrumbs on all inner pages | M |
| FR-NAV-06 | Dedicated search engine (Meilisearch/Typesense class) with merchandising rules (pin, boost, bury) and zero-result analytics **NEW** | M |
| FR-NAV-07 | Semantic / natural-language search ("black formal shirt under 3000") **NEW** | C |
| FR-NAV-08 | Visual search (search by image) **NEW** | C |

### 4.3 Product Listing Page (PLP)

| ID | Requirement | Pri |
| --- | --- | --- |
| FR-PLP-01 | Card: image (second image on hover), name, sale price, original price, discount badge, size chips | M |
| FR-PLP-02 | Filters: size, colour, price, fit, category, availability, discount, fabric **UPDATED** | M |
| FR-PLP-03 | Sort: Newest, Price low-high, Price high-low, Best selling, Discount | M |
| FR-PLP-04 | "Load more" or pagination preserving URL and scroll position | M |
| FR-PLP-05 | Quick-add / quick-view with size selection | S |
| FR-PLP-06 | Wishlist heart on cards | M |
| FR-PLP-07 | Filter state in URL (shareable, indexable rules for SEO) **NEW** | M |
| FR-PLP-08 | Colour swatches on cards switch the card image **NEW** | S |

### 4.4 Product Detail Page (PDP)

| ID | Requirement | Pri |
| --- | --- | --- |
| FR-PDP-01 | Gallery with zoom and swipe; optional product video | M |
| FR-PDP-02 | Variants: size and colour; out-of-stock sizes visibly disabled | M |
| FR-PDP-03 | Price block with discount % and savings | M |
| FR-PDP-04 | Size guide modal per category (cm/inches) | M |
| FR-PDP-05 | Description, fabric, care, fit, model size info | M |
| FR-PDP-06 | Real-time stock indicator ("Only 3 left") | S |
| FR-PDP-07 | Delivery estimate by city, COD availability, return summary | M |
| FR-PDP-08 | Related products and "Complete the look" | S |
| FR-PDP-09 | Reviews and ratings from verified buyers, with photos **UPDATED** | S |
| FR-PDP-10 | Notify me when back in stock (email/WhatsApp) | S |
| FR-PDP-11 | Share (WhatsApp, Facebook, copy link) | S |
| FR-PDP-12 | Size recommendation from height/weight or past purchases **NEW** | C |
| FR-PDP-13 | Pre-order / made-to-order flag with expected dispatch date **NEW** | S |
| FR-PDP-14 | "Order on WhatsApp" button prefilled with product, size and link **NEW** | S |
| FR-PDP-15 | 360 view or short video per product **NEW** | C |

### 4.5 Cart

| ID | Requirement | Pri |
| --- | --- | --- |
| FR-CART-01 | Slide-out drawer: image, size, qty, price, remove | M |
| FR-CART-02 | Empty state with "Continue shopping" | M |
| FR-CART-03 | Guest cart persists; merges after login | M |
| FR-CART-04 | Coupon / promo code field | M |
| FR-CART-05 | Free-shipping progress bar | S |
| FR-CART-06 | Stock re-validation before checkout | M |
| FR-CART-07 | Cart reservation timer during active checkout only **NEW** | C |
| FR-CART-08 | In-cart upsell / cross-sell ("Add a belt for Rs. X") **NEW** | C |

### 4.6 Checkout & Payments

| ID | Requirement | Pri |
| --- | --- | --- |
| FR-CHK-01 | Guest and logged-in checkout | M |
| FR-CHK-02 | Single-page or 2-step checkout: contact, address, shipping, payment, review | M |
| FR-CHK-03 | Pakistan address format: name, mobile (03xx / +92), city dropdown, full address, area/landmark | M |
| FR-CHK-04 | Payments: Cash on Delivery, cards (Visa/Mastercard) via hosted gateway, JazzCash, Easypaisa, bank transfer / Raast QR, optional BNPL **UPDATED** | M |
| FR-CHK-05 | Shipping rates by city/weight; free-shipping threshold | M |
| FR-CHK-06 | COD verification via OTP (SMS/WhatsApp) or confirmation call; risk-based, applied to high-risk orders | S |
| FR-CHK-07 | Confirmation page plus email/SMS/WhatsApp confirmation | M |
| FR-CHK-08 | Abandoned-cart recovery (email/WhatsApp) with consent | S |
| FR-CHK-09 | Address autocomplete and city/area validation **NEW** | S |
| FR-CHK-10 | Partial-COD / advance-payment rules for high-value or high-risk orders **NEW** | S |
| FR-CHK-11 | Wallet / store credit and gift-card redemption **NEW** | C |
| FR-CHK-12 | Idempotent order creation and payment webhooks; duplicate-order protection **NEW** | M |
| FR-CHK-13 | Fraud rules: velocity limits, blocklist (phone/address/IP), repeat-refuser flags **NEW** | S |

### 4.7 Customer Account

| ID | Requirement | Pri |
| --- | --- | --- |
| FR-ACC-01 | Register / sign in with email or mobile OTP; Google login | M |
| FR-ACC-02 | Password reset | M |
| FR-ACC-03 | My Orders: status, items, invoice download, reorder | M |
| FR-ACC-04 | Wishlist with back-in-stock and price-drop alerts **UPDATED** | M |
| FR-ACC-05 | Address book and profile | M |
| FR-ACC-06 | Self-service returns/exchange portal with reason, photos, pickup and refund method | S |
| FR-ACC-07 | Public Track Your Order (order number + phone) | M |
| FR-ACC-08 | Communication preferences and consent management; data export/deletion request **NEW** | M |
| FR-ACC-09 | Saved size profile **NEW** | C |

### 4.8 Promotions & Marketing

| ID | Requirement | Pri |
| --- | --- | --- |
| FR-PRM-01 | Store-wide and category-wise percentage discounts with start/end dates | M |
| FR-PRM-02 | Coupons: percentage, fixed, free shipping, usage limits, minimum cart | M |
| FR-PRM-03 | Buy X Get Y, bundles, tiered discounts (buy 2 get 10%) | S |
| FR-PRM-04 | Newsletter signup with consent | M |
| FR-PRM-05 | Gift cards | C |
| FR-PRM-06 | Loyalty points and referral codes | C |
| FR-PRM-07 | First-order discount and WhatsApp subscription incentive **NEW** | S |
| FR-PRM-08 | Flash sales with countdown and inventory caps **NEW** | S |
| FR-PRM-09 | Product feed export for Google Merchant Center and Meta Catalog **NEW** | S |
| FR-PRM-10 | Automated lifecycle flows: welcome, abandoned cart, post-purchase review request, win-back **NEW** | S |

### 4.9 WhatsApp & Conversational Commerce (NEW)

| ID | Requirement | Pri |
| --- | --- | --- |
| FR-WA-01 | WhatsApp Business API for order updates, OTP, back-in-stock and abandoned-cart messages (template-approved, opt-in only) | S |
| FR-WA-02 | Floating chat button and "Order on WhatsApp" deep links | S |
| FR-WA-03 | Shared support inbox for staff; order lookup inside conversation | C |
| FR-WA-04 | AI assistant for FAQs, order status and sizing with human handoff | C |

### 4.10 Static & Policy Pages

About, Contact Us, Store Locator, Terms, Privacy, Refund, Exchange & Return, Cancellation, Shipping, FAQs, Size Guide. All CMS-editable and versioned.

### 4.11 Admin Panel

| ID | Requirement | Pri |
| --- | --- | --- |
| FR-ADM-01 | Role-based access with per-module permissions; 2FA; session timeout | M |
| FR-ADM-02 | Products: variants, SKUs, images, SEO, bulk CSV/Excel import/export with validation preview | M |
| FR-ADM-03 | Categories, collections (manual + rule-based), menu builder | M |
| FR-ADM-04 | Inventory per variant, low-stock alerts, adjustment log, optional multi-location | M |
| FR-ADM-05 | Orders: filter, status, edit, cancel, partial refund, notes, invoice, packing slip | M |
| FR-ADM-06 | Courier integration: booking, labels, tracking sync, COD reconciliation (TCS, Leopards, PostEx, Trax, M&P as agreed) | M |
| FR-ADM-07 | Customers, order history, block list | M |
| FR-ADM-08 | Discounts, coupons, banners | M |
| FR-ADM-09 | Dashboard: sales, orders, AOV, top products, conversion, returns, COD vs prepaid | M |
| FR-ADM-10 | Reports export (sales, stock, tax, COD reconciliation) | S |
| FR-ADM-11 | Immutable audit log of admin actions | M |
| FR-ADM-12 | Draft orders / manual order entry for phone and WhatsApp sales **NEW** | S |
| FR-ADM-13 | Content preview and scheduled publish for banners, pages, sales **NEW** | S |
| FR-ADM-14 | Review moderation and replies **NEW** | S |
| FR-ADM-15 | Mobile/tablet-friendly order handling screens | S |

### 4.12 Order Lifecycle

Pending > Confirmed > Packed > Shipped > Out for delivery > Delivered. Alternate: Cancelled, Failed delivery, Return requested > Returned > Refunded/Exchanged. The lifecycle is modelled as an explicit state machine; illegal transitions are rejected and every transition is logged and notifies the customer where relevant.

### 4.13 Integrations

Payment gateway(s), courier APIs, SMS and WhatsApp providers, email provider, GA4, Meta Pixel + Conversions API, TikTok Pixel + Events API, Google Search Console, Google Merchant Center, optional ERP/accounting/POS sync (the platform exposes a documented API so it can connect to the company's ERP). Tax and invoicing obligations (including any FBR/POS invoicing requirement) are to be confirmed with the business's tax adviser before build.

## 4A. Storefront Screens and Journeys

| # | Screen | Key elements |
| --- | --- | --- |
| U1 | Home | Announcement bar, hero, department tiles, tabbed rows, recommendations, newsletter |
| U2 | Department landing | Banner, category tiles, sale/new rows |
| U3 | PLP | Filters, sort, grid, badges, size chips, wishlist |
| U4 | Search results | Suggestions, filters, no-results with alternatives |
| U5 | PDP | Gallery, variants, size guide, stock, delivery info, related items, sticky add-to-cart |
| U6 | Cart drawer and page | Items, qty, coupon, shipping bar, subtotal |
| U7 | Checkout | Contact, address, shipping, payment, summary |
| U8 | Order confirmation | Number, summary, ETA, track link |
| U9 | Sign in / register / reset | Email or mobile OTP, Google |
| U10 | My Account | Profile, addresses, orders, wishlist, returns, preferences |
| U11 | Order detail | Timeline, items, invoice, cancel/return/exchange |
| U12 | Track Your Order | Order number + phone, courier status |
| U13 | Wishlist | Saved items, move to cart, alerts |
| U14 | Store locator | Branches, timings, map |
| U15 | Contact / support | Form, phone, WhatsApp, FAQ |
| U16 | Policy pages | About, Terms, Privacy, Refund, Exchange, Cancellation, Shipping |
| U17 | 404 / error / maintenance | Friendly message with search and shop links |

**Core journeys:** (1) Browse to buy; (2) Return/exchange; (3) Track order; (4) Back in stock; (5) WhatsApp order **NEW**.

**User-side rules:** prices in PKR including tax, formatted "Rs. 2,499"; out-of-stock sizes shown but disabled; stock re-checked at payment; guests offered account creation after checkout; cancellation allowed only before shipment.

## 4B. Admin Modules and Workflows

**Roles:** Owner, Store Manager, Inventory Manager, Order/Warehouse, Customer Support, Marketing. Permissions are configurable per module (view/create/edit/delete/export).

**Modules:** A1 Dashboard, A2 Products, A3 Categories & Collections, A4 Inventory, A5 Orders, A6 Shipping & Couriers, A7 Payments, A8 Returns & Exchanges, A9 Customers, A10 Discounts & Coupons, A11 Content (CMS), A12 Marketing, A13 Reviews, A14 Reports, A15 Notifications, A16 Settings.

**Core workflows:** add product; fulfil order (COD verification, pack, courier booking, label, shipped, tracking sync, delivered, COD reconciled); run a sale with automatic revert; handle return; restock with back-in-stock alerts.

**Rules:** every stock, price and order change is logged with user and timestamp; orders cannot be deleted, only cancelled; sensitive actions (refund, price override, user deletion) need explicit permission; admin storefront changes reflect on the site within 1 minute.

## 5. Architecture & Technical Requirements

### 5.1 Principles

1. **Modular monolith first.** One deployable backend with strict module boundaries (catalog, pricing, inventory, cart, checkout, orders, payments, shipping, customers, content, notifications). Modules talk through defined interfaces and events, so any module can later be extracted.
2. **Contract-first.** OpenAPI (REST) or typed schema is written and reviewed before implementation; frontend and backend are generated against it.
3. **Everything as code.** Infrastructure, configuration, migrations, CI/CD and documentation live in the repository.
4. **Production parity.** Dev, staging and production differ only in configuration and scale.
5. **Secure and observable by default,** not retrofitted.
6. **Decisions are recorded** as ADRs.

### 5.2 Recommended stack (to be confirmed in Phase 0 by ADR)

The v1.0 options remain (A: Shopify, B: WooCommerce/Medusa/Saleor, C: custom). Given the need for Pakistani payment/courier flexibility, WhatsApp flows and ERP integration, the recommendation is **Option C (custom, composable)**, with Medusa as the fallback if time-to-market outweighs control.

| Layer | Recommendation |
| --- | --- |
| Storefront | Next.js (TypeScript), server-side rendering and caching, PWA, Tailwind with design tokens, i18n and RTL-ready |
| Admin | React admin app (TypeScript) on the same API, role-aware |
| API / backend | TypeScript (NestJS) or Python (Django/DRF) modular monolith; REST with OpenAPI; background jobs through a queue |
| Database | PostgreSQL (migrations versioned; no manual schema edits) |
| Cache / queue | Redis (cache, rate limits, job queue) |
| Search | Meilisearch or Typesense |
| Media | S3-compatible object storage + CDN with on-the-fly WebP/AVIF resizing |
| Edge / security | Cloudflare (CDN, WAF, DDoS, rate limiting) |
| Hosting | AWS (containers behind a load balancer; managed Postgres and Redis) with autoscaling for sale days |
| Messaging | Email provider, SMS provider, WhatsApp Business API provider |
| Monitoring | Sentry (errors), uptime checks, structured logs, metrics dashboards, alerting |

### 5.3 Repository structure (monorepo)

```
libas-ul-fakhar/
├─ apps/
│  ├─ storefront/          # Next.js customer site
│  ├─ admin/               # Back-office web app
│  └─ api/                 # Modular monolith backend
│     └─ src/modules/
│        ├─ catalog/  pricing/  inventory/  cart/  checkout/
│        ├─ orders/  payments/  shipping/  customers/
│        ├─ content/  promotions/  notifications/  search/
│        └─ shared/        # auth, config, logging, errors, events
├─ packages/
│  ├─ ui/                  # Design system and tokens (from brand identity)
│  ├─ api-contracts/       # OpenAPI spec + generated typed clients
│  ├─ config/              # ESLint, TS, formatting presets
│  └─ i18n/                # Translation files (en now, ur later)
├─ infra/                  # Terraform/IaC, Docker, deployment manifests
├─ docs/
│  ├─ adr/                 # Architecture decision records
│  ├─ runbooks/            # Deploy, rollback, incident, restore
│  └─ api/  data-model/  test-plans/
├─ scripts/                # Seed data, import tools, maintenance
├─ .github/workflows/      # CI/CD pipelines
└─ README.md  CONTRIBUTING.md  CODEOWNERS
```

### 5.4 Engineering standards

- **Branching:** trunk-based with short-lived feature branches; pull requests required; CODEOWNERS review; no direct pushes to main.
- **CI on every PR:** lint, type-check, unit and integration tests, contract check, dependency and secret scanning, build.
- **CD:** automatic deploy to staging on merge; production by approved release with one-click rollback; database migrations are backward compatible (expand/contract).
- **Environments:** local (Docker Compose), dev, staging (production-like, masked data), production. Secrets in a secrets manager, never in the repo.
- **Feature flags** for unfinished or risky features so incomplete work can merge safely.
- **Testing pyramid:** unit tests for pricing, discount, tax, stock and order-state logic (high coverage); integration tests against a real database; end-to-end tests for core journeys (browse to COD order, return, sale activation); load tests before launch; accessibility and visual regression checks.
- **Definition of Done (per slice):** spec approved, contract merged, code reviewed, tests passing in CI, accessibility checked, logs/metrics added, docs updated, demoed on staging.

### 5.5 Data model (high level, expanded)

Product > Variant (SKU, size, colour, price, compare-at price, barcode) > InventoryLevel (per location) and InventoryMovement; Collection; Category; Customer > Address, ConsentRecord; Cart > CartItem; Order > OrderItem, Payment, Shipment, Return, StatusHistory; Discount/Coupon; GiftCard/WalletEntry; Banner, Page, MenuItem; AdminUser/Role/Permission; AuditLog; Review; Wishlist; NotificationTemplate/MessageLog; WebhookEvent (idempotency). Money is stored as integer minor units with currency; all timestamps are UTC.

## 6. Delivery Method: No Single-Prompt Builds

The site is **not** generated in one shot. AI-assisted coding is used inside a controlled engineering process:

1. **One slice at a time.** A slice is a thin vertical feature (for example, "add variant to cart") spanning database, API, UI and tests.
2. **Spec, then contract, then code.** Each slice starts with acceptance criteria and an API contract before any implementation prompt.
3. **Small, scoped prompts.** One module or file group per prompt, with the repository structure, conventions and relevant contracts supplied as context.
4. **Tests with every slice.** Tests are written or reviewed first for money, stock and order logic.
5. **Human review gate.** Every change goes through pull-request review and CI; AI output is never merged unreviewed.
6. **Demo and sign-off** on staging at the end of each milestone.

### 6.1 Milestones

| Phase | Milestone | Scope | Gate to pass |
| --- | --- | --- | --- |
| 0 | Discovery and foundations | Finalise this BRD, open questions, sitemap, wireframes, ADRs, repo skeleton, CI pipeline, environments, design tokens | Approved BRD, empty app deploys to staging via CI |
| 1 | Design | UI kit, home/PLP/PDP/cart/checkout/account/admin designs, RTL checks | Design sign-off |
| 2 | Core data and admin | Auth/roles, product, variant, inventory, categories, media upload, CSV import | Admin can create a product with variants and stock |
| 3 | Storefront browse | Home, menu, PLP, PDP, search, SEO basics | Catalogue browsable on mobile, Lighthouse target met |
| 4 | Cart and pricing | Cart, discounts, coupons, shipping rates, stock validation | Pricing test suite green |
| 5 | Checkout and payments | Guest/account checkout, COD, first gateway, idempotent orders, confirmations | Guest COD order under 2 minutes |
| 6 | Fulfilment | Order management, state machine, courier integration, notifications, tracking page | Order from placement to delivered end to end |
| 7 | Accounts and returns | Account area, wishlist, returns portal, back-in-stock | Return flow passes UAT |
| 8 | Growth features | WhatsApp flows, abandoned cart, feeds, server-side tracking, reviews | Tracking and feeds verified |
| 9 | Hardening | Security review, load test (500 concurrent), accessibility, backup/restore drill, runbooks | No open critical/high defects |
| 10 | Launch | Data migration, DNS, monitoring, hypercare | Go-live checklist signed |
| 11 | Phase 2 | Urdu (RTL) content, loyalty, advanced personalisation, native apps, virtual try-on | Ongoing |

Indicative timeline: Phases 0-1 about 3-5 weeks; Phases 2-8 about 8-12 weeks; Phases 9-10 about 3 weeks. To be confirmed after Phase 0 estimation.

## 7. Non-Functional Requirements

| Category | Requirement |
| --- | --- |
| Performance | LCP < 2.5s and INP < 200ms on 4G mobile; CLS < 0.1; key pages < 2 MB; WebP/AVIF, lazy-loaded, CDN delivered; Lighthouse performance 85+; API p95 < 500ms for catalogue reads |
| Scalability | 10x normal traffic during sales (500 concurrent users target in Phase 1) via caching, queueing and autoscaling; load tested before launch |
| Availability | 99.5% minimum uptime; automated daily backups with 30-day retention; point-in-time recovery; restore drill before launch (RPO 24h or better, RTO 4h) |
| Security | HTTPS/TLS only; PCI-DSS scope minimised via hosted gateway (no card data stored); hashed passwords (Argon2/bcrypt); CSRF/XSS/SQLi protection; rate limiting; admin 2FA; secrets management; dependency scanning; OWASP Top 10 and ASVS-style review; signed and verified webhooks |
| Privacy | Privacy policy, cookie/consent banner with consent-mode for analytics, consent logs, data export and deletion on request, PII minimised in logs |
| Accessibility | WCAG 2.1 AA: contrast, alt text, keyboard navigation, focus states |
| SEO | Clean URLs, meta/OG tags, XML sitemap, schema.org Product/Offer/Breadcrumb/Review markup, canonical tags, 301 redirects, server-rendered pages |
| Browser support | Latest two versions of Chrome, Safari, Edge, Firefox; Android 9+ and iOS 15+ |
| Localisation | English at launch; Urdu/Arabic RTL in Phase 2 (code RTL-ready from day one); PKR formatting (Rs. 2,499) |
| Observability | Structured logs with request IDs, error tracking, business metrics (orders/min, payment failures), alerts to on-call channel |
| Maintainability | Documented code, ADRs, runbooks, environment separation, automated CI/CD, dependency update policy |

## 8. Assumptions, Constraints and Risks

**Assumptions:** brand supplies photography, copy and master logo files; business holds courier and payment merchant accounts; catalogue structure follows Section 2 unless changed under Section 10.

**Constraints:** budget and timeline TBD; legal/IP: own brand name, logo, imagery and copy only; layout inspiration only from reference site.

**Risks and mitigations:**

- High COD return rate: OTP/confirmation call, risk rules, partial advance payment.
- Gateway approval delays: apply early; launch with COD first.
- Large catalogue image weight: automated optimisation pipeline.
- Sale-day traffic spikes: caching, autoscaling, load test.
- Stock mismatch with physical stores: single inventory source, adjustment log, optional store sync.
- Scope creep from "all latest features": strict Must/Should/Could tagging and phase gates.
- Unreviewed AI-generated code: mandatory PR review, CI and tests.

## 9. Acceptance Criteria

1. A guest can browse, filter, select a size, add to cart and place a COD order on mobile in under 2 minutes.
2. Admin can add a product with variants and images, set a 50% sale price and see it live within 1 minute.
3. Stock decrements on order and restores on cancel/return; concurrent orders cannot oversell the last unit.
4. Order status changes trigger customer notification and appear on Track Your Order.
5. Duplicate payment webhooks or double-clicks never create duplicate orders.
6. All Must requirements pass UAT; no open critical/high defects.
7. Performance, accessibility and security targets in Section 7 are met.
8. CI/CD, rollback and backup-restore have been demonstrated on staging.
9. Each milestone gate in Section 6.1 is signed off.

## 10. Open Questions

1. **Product scope:** the brand name ("garment of pride") may cover more than western wear. Confirm departments: Men, Women, Boys, Girls, and whether eastern/traditional wear, fabrics or accessories are included.
2. Final brand colours, fonts and master logo files (SVG/vector).
3. Payment providers and courier partners to onboard first.
4. Physical stores and POS/ERP integration needed at launch?
5. Tax and invoicing requirements (including any FBR integration).
6. WhatsApp Business API provider and whether the site name/number is already verified.
7. Final stack decision (Option C vs Medusa/Shopify) and hosting account ownership.
8. Budget, target launch date and expected catalogue size at launch.

## 11. Approval

| Role | Name | Signature | Date |
| --- | --- | --- | --- |
| Business Owner |  |  |  |
| Project Manager |  |  |  |
| Technical Lead |  |  |  |
