<p align="center">
  <img src="apps/storefront/public/brand/logo-full.png" alt="Libas-ul-Fakhar — لِباسُ الفخر" width="320">
</p>

# Libas-ul-Fakhar

Online store for **Libas-ul-Fakhar (لِباسُ الفخر, “the garment of pride”)**, a modern-heritage clothing brand in Pakistan. Mobile-first, cash-on-delivery first, WhatsApp-friendly, priced in PKR.

Built against the [Business & Software Requirements Document (BRD/SRS v2.0)](Libas-ul-Fakhar%20E-Commerce%20%E2%80%93%20BRD%20SRS%20v2.0.md), one vertical slice at a time.

## What's built

| Slice | Highlights |
| --- | --- |
| **1. Storefront MVP** | Brand design system from the logo; home, department listings with filters, Roman-Urdu-aware search, product pages with size guide and WhatsApp ordering; cart, coupons and guest COD checkout with oversell protection; order tracking; back office for orders and inventory |
| **2. Product management** | Admin product editor with colour × size stock, draft/active/archived status, scheduled sales that start and end on their own, department-wide sales, CSV import with preview and CSV export |
| **3. Product photos** | Per-colour photo uploads with ordering, automatic rotation and metadata stripping, AVIF/WebP delivery; photos used across the store |
| **4. Customer accounts** | Mobile OTP and Google sign-in, order history, address book, checkout prefill, wishlist sync across devices, data export and account deletion |
| **5. Tohfa-e-Khaas gift boxes** | Curated boxes of existing pieces with sizes and colours fixed by the admin, priced at a fixed amount or a % off the items; stock follows the items inside |
| **PostgreSQL and Docker** | Data in PostgreSQL with versioned migrations; Docker Compose setup for deployment ([DEPLOY.md](DEPLOY.md)) |

Full feature list, architecture notes and the remaining roadmap are in the [app README](apps/storefront/README.md).

## Run it locally

Requires **Node.js 22.18 or later** (developed on Node 24).

```bash
cd apps/storefront
npm install
cp .env.example .env.local
npm run db:setup
npm run dev
```

Requires **PostgreSQL** (developed on version 18). Create a database and user for the app first; the [app README](apps/storefront/README.md#run-it) has the one-line command.

Before running `db:setup`, edit `.env.local` and set at least:

- `DATABASE_URL`: connection to that database, e.g. `postgres://libas:PASSWORD@localhost:5432/libas_ul_fakhar`
- `ADMIN_PASSWORD`: password for the back office at `/admin`
- `AUTH_SECRET`: a long random string, used to secure customer sign-in

`npm run db:setup` creates the tables and fills them with 41 sample products. Then open http://localhost:3000. In development, sign-in codes are shown on screen because no SMS provider is connected yet.

Other commands (run inside `apps/storefront`):

| Command | Purpose |
| --- | --- |
| `npm test` | Unit tests (pricing, orders, search, sales, CSV, photos, accounts) |
| `npm run lint` | ESLint |
| `npm run build && npm start` | Production build and server |

## Deploy with Docker

```bash
cp .env.docker.example .env    # then fill in passwords and the site address
docker compose up -d db
docker compose build app
docker compose up -d
```

Settings, moving existing data in, updates, backups and HTTPS are covered in [DEPLOY.md](DEPLOY.md).

## Tech

Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS v4, sharp. Data is stored in PostgreSQL via node-postgres with versioned SQL migrations; product photos are stored on disk in `apps/storefront/data/uploads/` (cloud storage is a later step).

## Repository layout

```
├─ Libas-ul-Fakhar E-Commerce – BRD SRS v2.0.md   requirements
├─ لِبَاسُ الْفَخْرِ.png                              master logo
├─ docker-compose.yml, DEPLOY.md                  deployment
└─ apps/
   └─ storefront/                                  Next.js store + back office
```

## Before going live

Sample products and placeholder contact details (WhatsApp number, bank details, policy text) need replacing, and several integrations are still to come: SMS/WhatsApp delivery for sign-in codes, Google sign-in credentials, online payment gateways and courier booking. See “Placeholders to replace before launch” in the [app README](apps/storefront/README.md).
