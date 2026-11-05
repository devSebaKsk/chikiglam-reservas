-- Migration: add is_hidden column to packs
-- Hidden packs are excluded from the public listing but remain accessible via direct link.

ALTER TABLE packs ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_packs_hidden ON packs(is_hidden);
