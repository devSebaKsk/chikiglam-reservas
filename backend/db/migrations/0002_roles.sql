-- Migration: Expand roles & add is_active / updated_at to users
-- Created: 2024-03-01

-- SQLite no soporta ALTER COLUMN, así que recreamos la tabla con los nuevos constraints.

-- 1. Renombrar tabla actual
ALTER TABLE users RENAME TO users_old;

-- 2. Crear tabla nueva con los 5 roles y columnas adicionales
CREATE TABLE users (
  id           TEXT    PRIMARY KEY,
  name         TEXT    NOT NULL,
  email        TEXT    UNIQUE NOT NULL,
  password_hash TEXT   NOT NULL,
  phone        TEXT,
  role         TEXT    NOT NULL DEFAULT 'client'
                       CHECK(role IN ('superadmin', 'admin', 'employee', 'client', 'guest')),
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 3. Migrar datos existentes
--    Mapeo: el antiguo 'admin' → 'admin', todo lo demás → su valor actual
INSERT INTO users (id, name, email, password_hash, phone, role, is_active, created_at, updated_at)
SELECT
  id,
  name,
  email,
  password_hash,
  phone,
  CASE
    WHEN role = 'admin'  THEN 'admin'
    WHEN role = 'client' THEN 'client'
    ELSE 'client'
  END,
  1,
  created_at,
  created_at
FROM users_old;

-- 4. Eliminar tabla vieja
DROP TABLE users_old;

-- 5. Recrear índices
CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active   ON users(is_active);
