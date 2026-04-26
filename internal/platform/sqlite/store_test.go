package sqlite

import (
	"path/filepath"
	"testing"
)

// freshStore opens a SQLite store in t.TempDir(). Cleanup is automatic.
func freshStore(t *testing.T) *Store {
	t.Helper()
	path := filepath.Join(t.TempDir(), "memre-test.db")
	s, err := OpenAt(path)
	if err != nil {
		t.Fatalf("OpenAt: %v", err)
	}
	t.Cleanup(func() { _ = s.Close() })
	return s
}

func TestMigrationCreatesTables(t *testing.T) {
	s := freshStore(t)
	wanted := []string{"decks", "cards", "knowledge_sources", "settings"}
	for _, name := range wanted {
		row := s.DB.QueryRow(
			`SELECT count(*) FROM sqlite_master WHERE type='table' AND name=?`, name)
		var n int
		if err := row.Scan(&n); err != nil {
			t.Fatal(err)
		}
		if n != 1 {
			t.Errorf("expected table %q, got count=%d", name, n)
		}
	}
}

func TestPragmaForeignKeysOn(t *testing.T) {
	s := freshStore(t)
	row := s.DB.QueryRow(`PRAGMA foreign_keys`)
	var on int
	if err := row.Scan(&on); err != nil {
		t.Fatal(err)
	}
	if on != 1 {
		t.Errorf("foreign_keys must be ON, got %d", on)
	}
}

func TestOpenAtIsIdempotent(t *testing.T) {
	path := filepath.Join(t.TempDir(), "memre-test.db")
	a, err := OpenAt(path)
	if err != nil {
		t.Fatal(err)
	}
	a.Close()
	b, err := OpenAt(path) // re-running migration on existing file is safe
	if err != nil {
		t.Fatalf("re-open should succeed, got %v", err)
	}
	b.Close()
}
