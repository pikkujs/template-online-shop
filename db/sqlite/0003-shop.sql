-- Online shop: catalogue, baskets and orders.
--
-- A basket becomes an order when it is paid for. They are separate tables
-- because a basket is mutable and disposable and an order is neither — once
-- money has changed hands the row stops changing, and a correction becomes a
-- new fact rather than an edit.

CREATE TABLE IF NOT EXISTS category (
  category_id  TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  description  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS item (
  item_id      TEXT PRIMARY KEY,
  category_id  TEXT NOT NULL REFERENCES category(category_id),
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  description  TEXT,
  price_cents  INTEGER NOT NULL,
  -- Decremented when the order is placed, not when it ships: two shoppers
  -- buying the last item and one finding out days later is a worse failure
  -- than briefly over-reserving.
  stock        INTEGER NOT NULL DEFAULT 0,
  image_url    TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS item_category_idx ON item(category_id);

CREATE TABLE IF NOT EXISTS basket (
  basket_id    TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS basket_user_idx ON basket(user_id);

CREATE TABLE IF NOT EXISTS basket_item (
  basket_item_id TEXT PRIMARY KEY,
  basket_id    TEXT NOT NULL REFERENCES basket(basket_id),
  item_id      TEXT NOT NULL REFERENCES item(item_id),
  quantity     INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS basket_item_unique ON basket_item(basket_id, item_id);

CREATE TABLE IF NOT EXISTS "order" (
  order_id     TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  -- 'pending' | 'paid' | 'shipped' | 'cancelled'
  status       TEXT NOT NULL DEFAULT 'pending',
  total_cents  INTEGER NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS order_user_idx   ON "order"(user_id, created_at);
CREATE INDEX IF NOT EXISTS order_status_idx ON "order"(status);

CREATE TABLE IF NOT EXISTS order_item (
  order_item_id TEXT PRIMARY KEY,
  order_id     TEXT NOT NULL REFERENCES "order"(order_id),
  item_id      TEXT NOT NULL REFERENCES item(item_id),
  quantity     INTEGER NOT NULL,
  -- Price at the time of ordering. Reading it back off `item` would rewrite
  -- history every time somebody changes a price.
  unit_price_cents INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS order_item_order_idx ON order_item(order_id);
