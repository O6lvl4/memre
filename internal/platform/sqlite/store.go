// Package sqlite is the shared SQLite handle and migration. Each
// feature package owns its own table-specific repository and lives in
// the same package as its entity (consumer-side); this package only
// provides the connection.
package sqlite

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

type Store struct {
	DB *sql.DB
}

func (s *Store) Close() error { return s.DB.Close() }

func defaultPath() (string, error) {
	if v := os.Getenv("MEMRE_DB_PATH"); v != "" {
		return v, nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(home, "Library", "Application Support", "Memre")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return filepath.Join(dir, "memre.db"), nil
}

// Open dials SQLite with WAL + foreign_keys and runs the idempotent
// schema migration. Migration text intentionally lives here so the
// database shape is documented in one place.
func Open() (*Store, error) {
	path, err := defaultPath()
	if err != nil {
		return nil, err
	}
	return OpenAt(path)
}

// OpenAt opens the store at an explicit filesystem path. Tests pass
// t.TempDir() entries here to keep the production data store untouched.
func OpenAt(path string) (*Store, error) {
	dsn := fmt.Sprintf("file:%s?_pragma=journal_mode(WAL)&_pragma=foreign_keys(on)", path)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	s := &Store{DB: db}
	if err := s.migrate(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return s, nil
}

func (s *Store) migrate() error {
	_, err := s.DB.Exec(`
CREATE TABLE IF NOT EXISTS decks (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#4F46E5',
  description TEXT NOT NULL DEFAULT '',
  level       TEXT NOT NULL DEFAULT 'beginner',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (
  id                 TEXT PRIMARY KEY,
  deck_id            TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  question           TEXT NOT NULL,
  answer             TEXT NOT NULL,
  last_reviewed_date TEXT,
  next_review_date   TEXT,
  interval_days      REAL NOT NULL DEFAULT 0,
  ease_factor        REAL NOT NULL DEFAULT 2.5,
  review_count       INTEGER NOT NULL DEFAULT 0,
  lapse_count        INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_next_review ON cards(next_review_date);

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id         TEXT PRIMARY KEY,
  deck_id    TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  content    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'text',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ks_deck_id ON knowledge_sources(deck_id);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`)
	return err
}
