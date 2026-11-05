CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK(role IN ('superadmin','admin','employee','organizer','client','guest')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
INSERT INTO users_new SELECT * FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
