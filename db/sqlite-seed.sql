-- Demo seed data. Runs after migrations in local dev only (never in production).
-- All statements are idempotent (INSERT OR IGNORE).

INSERT OR IGNORE INTO category (category_id, name, slug, description) VALUES
  ('cat-electronics', 'Electronics',  'electronics',  'Gadgets, devices, and accessories'),
  ('cat-clothing',    'Clothing',      'clothing',      'Apparel for every occasion'),
  ('cat-books',       'Books',         'books',         'Fiction, non-fiction, and everything in between'),
  ('cat-kitchen',     'Kitchen',       'kitchen',       'Mugs, kettles, and other counter-top essentials');

INSERT OR IGNORE INTO item (item_id, category_id, name, slug, description, price_cents, stock) VALUES
  ('item-001', 'cat-electronics', 'Wireless Headphones',  'wireless-headphones',  'Over-ear noise-cancelling headphones', 7999,  42),
  ('item-002', 'cat-electronics', 'USB-C Hub',             'usb-c-hub',             '7-in-1 USB-C hub with HDMI and PD',   2999,  120),
  ('item-003', 'cat-electronics', 'Mechanical Keyboard',  'mechanical-keyboard',  'Compact TKL with brown switches',     8999,  15),
  ('item-004', 'cat-clothing',    'Merino Wool Tee',       'merino-wool-tee',       '100% merino, crew neck, unisex',      4499,  80),
  ('item-005', 'cat-clothing',    'Chino Shorts',          'chino-shorts',          'Slim fit, stretch cotton',            3499,  55),
  ('item-006', 'cat-books',       'The Pragmatic Programmer', 'pragmatic-programmer', '20th anniversary edition',         3999,  30),
  ('item-007', 'cat-books',       'Designing Data-Intensive Apps', 'ddia',          'Martin Kleppmann',                   4599,   8),
  -- The shopper scenario searches for "mug" — keep something matching in the seed.
  ('item-008', 'cat-kitchen',     'Coffee Mug',            'coffee-mug',            'Stoneware mug, 350ml, dishwasher safe', 1200, 200);

-- Demo profiles. Credentials live in Better Auth's own `user` table — sign up
-- through /auth/sign-up/email and the databaseHooks in auth.wiring.ts writes
-- the matching row here.
INSERT OR IGNORE INTO app_user (user_id, email, name, role) VALUES
  ('user-admin',    'admin@shop.dev',    'Admin User',    'admin'),
  ('user-customer', 'alice@example.com', 'Alice Example', 'customer');
