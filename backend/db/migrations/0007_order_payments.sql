-- Limpiar si quedó tabla de un intento anterior fallido
DROP TABLE IF EXISTS orders_new;

-- 1. Recrear orders con CHECK corregido (agrega 'completed')
CREATE TABLE orders_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  pack_id TEXT NOT NULL REFERENCES packs(id),
  people_count INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK(status IN ('pending_payment','pending_confirmation','confirmed','cancelled','completed')),
  total_price REAL NOT NULL,
  notes TEXT,
  promo_code_id TEXT REFERENCES promo_codes(id),
  discount_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO orders_new (id, user_id, pack_id, people_count, date, status, total_price, notes, promo_code_id, discount_amount, created_at, updated_at)
SELECT
  id,
  user_id,
  pack_id,
  people_count,
  date,
  status,
  total_price,
  notes,
  promo_code_id,
  COALESCE(discount_amount, 0),
  COALESCE(created_at, datetime('now')),
  COALESCE(updated_at, datetime('now'))
FROM orders;

DROP TABLE orders;
ALTER TABLE orders_new RENAME TO orders;

-- 2. Tabla de pagos parciales
CREATE TABLE IF NOT EXISTS order_payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  description TEXT,
  registered_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);
