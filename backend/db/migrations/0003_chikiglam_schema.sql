-- Migration: ChikiGlam domain schema
-- Created: 2026-03-24

-- ─── 1. Recrear users para permitir email y password_hash NULL (WhatsApp users) ───
ALTER TABLE users RENAME TO users_v2;

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE,
  password_hash TEXT,
  phone         TEXT UNIQUE,
  role          TEXT NOT NULL DEFAULT 'client'
                CHECK(role IN ('superadmin','admin','employee','client','guest')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO users (id, name, email, password_hash, phone, role, is_active, created_at, updated_at)
SELECT id, name, email, password_hash, phone, role, is_active, created_at, updated_at FROM users_v2;

DROP TABLE users_v2;

CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone  ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- ─── 2. OTP codes ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  id         TEXT    PRIMARY KEY,
  phone      TEXT    NOT NULL,
  code       TEXT    NOT NULL,
  expires_at TEXT    NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_otp_phone_used ON otp_codes(phone, used);

-- ─── 3. Packs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS packs (
  id                TEXT    PRIMARY KEY,
  name              TEXT    NOT NULL,
  short_description TEXT    NOT NULL,
  full_description  TEXT    NOT NULL,
  image_key         TEXT,
  min_people        INTEGER NOT NULL DEFAULT 1,
  max_people        INTEGER NOT NULL DEFAULT 20,
  is_active         INTEGER NOT NULL DEFAULT 1,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_packs_active ON packs(is_active, sort_order);

-- ─── 4. Pack prices ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pack_prices (
  id           TEXT    PRIMARY KEY,
  pack_id      TEXT    NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  people_count INTEGER NOT NULL,
  price        REAL    NOT NULL,
  UNIQUE(pack_id, people_count)
);
CREATE INDEX IF NOT EXISTS idx_pack_prices_pack ON pack_prices(pack_id);

-- ─── 5. Resources (inventario físico) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resources (
  id         TEXT    PRIMARY KEY,
  name       TEXT    NOT NULL UNIQUE,
  quantity   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── 6. Pack resources (consumo por pack) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS pack_resources (
  id          TEXT    PRIMARY KEY,
  pack_id     TEXT    NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  resource_id TEXT    NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1,
  UNIQUE(pack_id, resource_id)
);
CREATE INDEX IF NOT EXISTS idx_pack_resources_pack ON pack_resources(pack_id);

-- ─── 7. Additionals (extras) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS additionals (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  description TEXT,
  price       REAL    NOT NULL,
  image_key   TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── 8. Orders ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id           TEXT    PRIMARY KEY,
  user_id      TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_id      TEXT    NOT NULL REFERENCES packs(id),
  people_count INTEGER NOT NULL,
  date         TEXT    NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'pending_payment'
               CHECK(status IN ('pending_payment','pending_confirmation','confirmed','cancelled')),
  total_price  REAL    NOT NULL,
  notes        TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_user        ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_date        ON orders(date);
CREATE INDEX IF NOT EXISTS idx_orders_date_status ON orders(date, status);

-- ─── 9. Order additionals ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_additionals (
  id            TEXT    PRIMARY KEY,
  order_id      TEXT    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  additional_id TEXT    NOT NULL REFERENCES additionals(id),
  quantity      INTEGER NOT NULL DEFAULT 1,
  unit_price    REAL    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_additionals ON order_additionals(order_id);

-- ─── 10. Payment uploads ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_uploads (
  id          TEXT    PRIMARY KEY,
  order_id    TEXT    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  file_key    TEXT    NOT NULL,
  uploaded_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payment_uploads ON payment_uploads(order_id);

-- ─── 11. Settings ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('payment_alias', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('payment_instructions', 'Transferí al alias indicado y subí el comprobante.');
INSERT OR IGNORE INTO settings (key, value) VALUES ('whatsapp_number', '');

-- ─── 12. Seeds de recursos ejemplo ───────────────────────────────────────────
INSERT OR IGNORE INTO resources (id, name, quantity) VALUES
  ('res-carpas', 'Carpas', 2),
  ('res-colchones', 'Colchones', 18);
