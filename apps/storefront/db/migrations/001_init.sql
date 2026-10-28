-- Libas-ul-Fakhar initial schema (BRD 5.5 data model).
-- Money is integer paisa (PKR minor units); all timestamps are timestamptz (UTC).

-- ---------------------------------------------------------------- catalogue

CREATE TABLE products (
  id                  text PRIMARY KEY,
  slug                text NOT NULL UNIQUE,
  status              text NOT NULL CHECK (status IN ('active', 'draft', 'archived')),
  name                text NOT NULL,
  department          text NOT NULL,
  category            text NOT NULL,
  product_group       text NOT NULL,
  garment             text NOT NULL,
  base_price          integer NOT NULL CHECK (base_price > 0),
  sale_price          integer CHECK (sale_price > 0),
  sale_starts_at      timestamptz,
  sale_ends_at        timestamptz,
  colours             jsonb NOT NULL DEFAULT '[]',   -- [{name, hex}] in display order
  sizes               text[] NOT NULL DEFAULT '{}',
  images              jsonb NOT NULL DEFAULT '[]',   -- [{id, url, width, height, colour?, alt?}] in display order
  fabric              text NOT NULL,
  fit                 text NOT NULL,
  care                text[] NOT NULL DEFAULT '{}',
  description         text NOT NULL,
  model_info          text,
  tags                text[] NOT NULL DEFAULT '{}',
  pre_order_dispatch  text,
  sales_rank          integer NOT NULL DEFAULT 999,
  rating              double precision NOT NULL DEFAULT 0,
  reviews             jsonb NOT NULL DEFAULT '[]',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz
);
CREATE INDEX products_status_department ON products (status, department);

-- One row per colour x size. Stock lives here so orders can decrement it atomically.
CREATE TABLE variants (
  sku         text PRIMARY KEY,
  product_id  text NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  colour      text NOT NULL,
  size        text NOT NULL,
  stock       integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  position    integer NOT NULL DEFAULT 0,
  UNIQUE (product_id, colour, size)
);
CREATE INDEX variants_product ON variants (product_id, position);

-- ---------------------------------------------------------------- customers

CREATE TABLE customers (
  id                text PRIMARY KEY,
  name              text,
  phone             text UNIQUE,          -- 03xxxxxxxxx, only once verified by OTP
  email             text,
  google_sub        text UNIQUE,
  marketing_opt_in  boolean NOT NULL DEFAULT false,
  wishlist          text[] NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz,
  last_login_at     timestamptz
);

CREATE TABLE addresses (
  id           text PRIMARY KEY,
  customer_id  text NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  label        text,
  name         text NOT NULL,
  phone        text NOT NULL,
  email        text,
  city         text NOT NULL,
  address      text NOT NULL,
  area         text,
  is_default   boolean NOT NULL DEFAULT false,
  position     integer NOT NULL DEFAULT 0
);
CREATE INDEX addresses_customer ON addresses (customer_id, position);

-- Session tokens and OTP codes are stored only as hashes.
CREATE TABLE sessions (
  hash         text PRIMARY KEY,
  customer_id  text NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL
);
CREATE INDEX sessions_expiry ON sessions (expires_at);

CREATE TABLE otps (
  phone       text PRIMARY KEY,
  hash        text NOT NULL,
  expires_at  timestamptz NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  sent_at     timestamptz[] NOT NULL DEFAULT '{}'
);

-- ---------------------------------------------------------------- orders

CREATE TABLE orders (
  number           text PRIMARY KEY,
  idempotency_key  text NOT NULL UNIQUE,
  customer_id      text REFERENCES customers (id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  status           text NOT NULL,
  payment          text NOT NULL CHECK (payment IN ('cod', 'bank')),
  coupon           text,
  phone            text NOT NULL,       -- copy of address.phone for tracking and account lookup
  address          jsonb NOT NULL,      -- {name, phone, email?, city, address, area?}
  totals           jsonb NOT NULL,      -- {subtotal, discount, shipping, total, couponApplied?}
  notes            text
);
CREATE INDEX orders_created ON orders (created_at DESC);
CREATE INDEX orders_customer ON orders (customer_id);
CREATE INDEX orders_phone ON orders (phone);

-- Snapshot of what was bought; deliberately no FK to products/variants so
-- orders survive catalogue edits.
CREATE TABLE order_items (
  order_number  text NOT NULL REFERENCES orders (number) ON DELETE CASCADE,
  position      integer NOT NULL,
  product_id    text NOT NULL,
  sku           text NOT NULL,
  name          text NOT NULL,
  size          text NOT NULL,
  colour        text NOT NULL,
  unit_price    integer NOT NULL,
  qty           integer NOT NULL CHECK (qty > 0),
  garment       text,
  hex           text,
  image         text,
  PRIMARY KEY (order_number, position)
);
CREATE INDEX order_items_product ON order_items (product_id);

CREATE TABLE order_history (
  id            bigserial PRIMARY KEY,
  order_number  text NOT NULL REFERENCES orders (number) ON DELETE CASCADE,
  status        text NOT NULL,
  at            timestamptz NOT NULL DEFAULT now(),
  by            text NOT NULL,
  note          text
);
CREATE INDEX order_history_order ON order_history (order_number, id);

-- ---------------------------------------------------------------- marketing & audit

CREATE TABLE subscribers (
  contact  text PRIMARY KEY,
  at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stock_alerts (
  id       bigserial PRIMARY KEY,
  sku      text NOT NULL,
  contact  text NOT NULL,
  at       timestamptz NOT NULL DEFAULT now()
);

-- Immutable log of admin and account actions (FR-ADM-11).
CREATE TABLE audit_log (
  id      bigserial PRIMARY KEY,
  at      timestamptz NOT NULL DEFAULT now(),
  by      text NOT NULL,
  action  text NOT NULL,
  target  text NOT NULL,
  detail  text
);
CREATE INDEX audit_log_target ON audit_log (target, id DESC);
