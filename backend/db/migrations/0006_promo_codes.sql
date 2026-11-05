CREATE TABLE IF NOT EXISTS promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK(discount_type IN ('percent', 'amount')),
  discount_value REAL NOT NULL,
  applicable_pack_ids TEXT,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  created_at TEXT NOT NULL
);

ALTER TABLE orders ADD COLUMN promo_code_id TEXT REFERENCES promo_codes(id);
ALTER TABLE orders ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0;
