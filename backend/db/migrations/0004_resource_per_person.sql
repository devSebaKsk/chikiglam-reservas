-- Migration: Resource per-person quantities and unlimited support
-- Created: 2026-03-25

-- ─── 1. Make resources.quantity nullable (NULL = unlimited) ──────────────────
CREATE TABLE resources_new (
  id         TEXT    PRIMARY KEY,
  name       TEXT    NOT NULL UNIQUE,
  quantity   INTEGER,                    -- NULL means unlimited stock
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO resources_new SELECT id, name, quantity, created_at, updated_at FROM resources;
DROP TABLE resources;
ALTER TABLE resources_new RENAME TO resources;

-- ─── 2. pack_resources: rename quantity → quantity_fixed, add quantity_per_person ─
ALTER TABLE pack_resources RENAME COLUMN quantity TO quantity_fixed;
ALTER TABLE pack_resources ADD COLUMN quantity_per_person INTEGER NOT NULL DEFAULT 0;