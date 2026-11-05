-- Migration: Add category to packs
-- Created: 2026-03-25

ALTER TABLE packs ADD COLUMN category TEXT CHECK(category IN ('carpa','adentro','talleres','grandes')) DEFAULT NULL;
