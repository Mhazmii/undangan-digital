-- Skema Database — Premium Wedding Invitation Studio
-- Persis dari CONTRACT.md §3. Dijalankan idempotent oleh db.js (FK ON).
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions(
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS templates(
  id TEXT PRIMARY KEY,               -- 't01'..'t08'
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'classic',
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS weddings(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,         -- lowercase, [a-z0-9-]
  title TEXT NOT NULL,
  template_id TEXT NOT NULL DEFAULT 't01' REFERENCES templates(id),
  theme_config TEXT NOT NULL DEFAULT '{}',  -- JSON: colors, fonts override, music, motion preset
  music_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',     -- draft|published
  owner_id INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS wedding_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id INTEGER NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                -- akad|resepsi|custom
  title TEXT NOT NULL,
  event_date TEXT NOT NULL,          -- YYYY-MM-DD
  start_time TEXT DEFAULT '', end_time TEXT DEFAULT '',
  venue_name TEXT DEFAULT '', address TEXT DEFAULT '', maps_url TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS wedding_sections(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id INTEGER NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,         -- cover,hero,quote,couple,parents,events,countdown,story,gallery,rsvp,wishes,gift,location,dresscode,info,closing
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  config TEXT NOT NULL DEFAULT '{}', -- JSON per-section (teks, dll)
  UNIQUE(wedding_id, section_key)
);
CREATE TABLE IF NOT EXISTS wedding_guests(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id INTEGER NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  token TEXT UNIQUE NOT NULL,        -- 12 char url-safe untuk link personal
  group_name TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_guests_wedding ON wedding_guests(wedding_id);
CREATE TABLE IF NOT EXISTS rsvps(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id INTEGER NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  guest_id INTEGER REFERENCES wedding_guests(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  attendance TEXT NOT NULL,          -- yes|no
  guest_count INTEGER NOT NULL DEFAULT 1,
  message TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rsvp_wedding ON rsvps(wedding_id);
CREATE TABLE IF NOT EXISTS wedding_wishes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id INTEGER NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|approved|hidden
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wishes_wedding ON wedding_wishes(wedding_id, status);
CREATE TABLE IF NOT EXISTS gallery_images(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id INTEGER NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  url TEXT NOT NULL, caption TEXT DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS gift_methods(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id INTEGER NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                -- bank|ewallet|address
  provider TEXT NOT NULL,            -- BCA, DANA, ...
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  note TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS media_assets(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id INTEGER NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                -- photo|music
  url TEXT NOT NULL, label TEXT DEFAULT ''
);
