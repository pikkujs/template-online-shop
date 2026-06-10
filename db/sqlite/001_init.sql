-- Online Shop — initial schema
-- All IDs are TEXT (UUID). Prices are stored as INTEGER cents to avoid float rounding.

CREATE TABLE IF NOT EXISTS category (
  category_id   TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS item (
  item_id       TEXT PRIMARY KEY,
  category_id   TEXT NOT NULL REFERENCES category(category_id),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  price_cents   INTEGER NOT NULL,
  stock         INTEGER NOT NULL DEFAULT 0,
  image_url     TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS app_user (
  user_id       TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT,
  role          TEXT NOT NULL DEFAULT 'customer',
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS basket (
  basket_id     TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES app_user(user_id),
  session_id    TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS basket_user_unique ON basket(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS basket_session_unique ON basket(session_id) WHERE session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS basket_item (
  basket_item_id TEXT PRIMARY KEY,
  basket_id      TEXT NOT NULL REFERENCES basket(basket_id) ON DELETE CASCADE,
  item_id        TEXT NOT NULL REFERENCES item(item_id),
  quantity       INTEGER NOT NULL DEFAULT 1,
  UNIQUE(basket_id, item_id)
);

CREATE TABLE IF NOT EXISTS "order" (
  order_id         TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES app_user(user_id),
  status           TEXT NOT NULL DEFAULT 'pending',
  total_cents      INTEGER NOT NULL,
  shipping_address TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS order_item (
  order_item_id  TEXT PRIMARY KEY,
  order_id       TEXT NOT NULL REFERENCES "order"(order_id) ON DELETE CASCADE,
  item_id        TEXT NOT NULL REFERENCES item(item_id),
  quantity       INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  UNIQUE(order_id, item_id)
);

CREATE TABLE IF NOT EXISTS payment (
  payment_id    TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL REFERENCES "order"(order_id),
  amount_cents  INTEGER NOT NULL,
  provider      TEXT NOT NULL DEFAULT 'fake',
  status        TEXT NOT NULL DEFAULT 'pending',
  provider_ref  TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  audit_id      TEXT PRIMARY KEY,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  action        TEXT NOT NULL,
  actor_id      TEXT,
  payload       TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
