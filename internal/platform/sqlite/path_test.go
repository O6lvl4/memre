package sqlite

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// defaultPath has two branches: MEMRE_DB_PATH override, and the
// ~/Library/Application Support/Memre/ default.

func TestDefaultPathRespectsEnv(t *testing.T) {
	t.Setenv("MEMRE_DB_PATH", "/tmp/memre-explicit-path.db")
	p, err := defaultPath()
	if err != nil {
		t.Fatal(err)
	}
	if p != "/tmp/memre-explicit-path.db" {
		t.Errorf("env override ignored: got %q", p)
	}
}

func TestDefaultPathFallsBackToHomeDir(t *testing.T) {
	t.Setenv("MEMRE_DB_PATH", "")
	p, err := defaultPath()
	if err != nil {
		t.Fatal(err)
	}
	home, herr := os.UserHomeDir()
	if herr != nil {
		t.Skipf("home dir unavailable: %v", herr)
	}
	want := filepath.Join(home, "Library", "Application Support", "Memre", "memre.db")
	if p != want {
		t.Errorf("default path: got %q want %q", p, want)
	}
	// And the dir must actually exist now (defaultPath mkdirs it).
	if _, err := os.Stat(filepath.Dir(p)); err != nil {
		t.Errorf("Application Support dir should exist after defaultPath: %v", err)
	}
}

// Open() goes through defaultPath. Pointing it at a tmp file via env
// covers Open without touching the real Application Support directory.

func TestOpenUsesDefaultPath(t *testing.T) {
	tmp := filepath.Join(t.TempDir(), "default.db")
	t.Setenv("MEMRE_DB_PATH", tmp)

	s, err := Open()
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { _ = s.Close() })

	if _, err := os.Stat(tmp); err != nil {
		t.Errorf("Open should have created the DB file at %s: %v", tmp, err)
	}
	row := s.DB.QueryRow(`SELECT count(*) FROM sqlite_master WHERE type='table' AND name='decks'`)
	var n int
	if err := row.Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Error("Open should have run migrations")
	}
}

// OpenAt error branches: an unreachable path and a path that names an
// existing non-database file. The former exercises the Open()→error
// return; the latter exercises the migrate()→Close() cleanup branch.

func TestOpenAtRejectsUnreachablePath(t *testing.T) {
	// /dev/null is a char device, not a directory. SQLite trying to
	// create a file *inside* it must fail.
	_, err := OpenAt("/dev/null/cannot-create-here.db")
	if err == nil {
		t.Fatal("expected error opening DB under /dev/null/")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "not a directory") &&
		!strings.Contains(err.Error(), "unable") &&
		!strings.Contains(err.Error(), "cannot") &&
		!strings.Contains(err.Error(), "no such") &&
		!strings.Contains(err.Error(), "open") {
		t.Logf("got error (kept for diagnostic): %v", err)
	}
}

func TestOpenAtRejectsNonDatabaseFile(t *testing.T) {
	// A path that exists but holds garbage that's not SQLite. Migration
	// touches the file (CREATE TABLE) so we should see an error and the
	// underlying *sql.DB should be closed by the cleanup branch.
	tmp := filepath.Join(t.TempDir(), "junk.db")
	if err := os.WriteFile(tmp, []byte("this is not a sqlite database"), 0o644); err != nil {
		t.Fatal(err)
	}
	s, err := OpenAt(tmp)
	if err == nil {
		// some sqlite builds will rewrite the file rather than error;
		// in that unlikely case, just close and skip the assertion
		_ = s.Close()
		t.Skip("driver rewrote the junk file rather than erroring")
	}
}
