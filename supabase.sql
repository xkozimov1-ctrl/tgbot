-- Bitta jadval yetarli!
CREATE TABLE IF NOT EXISTS movies (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  year INTEGER,
  rating DECIMAL(3,1),
  description TEXT,
  file_id TEXT NOT NULL,
  type TEXT DEFAULT 'anime',
  genre TEXT[] DEFAULT '{}',
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  language TEXT DEFAULT 'uz',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  telegram_id BIGINT PRIMARY KEY
);

-- INDEX
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);