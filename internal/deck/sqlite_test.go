package deck

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/O6lvl4/memre/internal/platform/sqlite"
)

func openRepo(t *testing.T) (*SqliteRepository, *sqlite.Store) {
	t.Helper()
	store, err := sqlite.OpenAt(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })
	return NewSqliteRepository(store), store
}

func TestSqliteCreateAndFind(t *testing.T) {
	r, _ := openRepo(t)
	d := Deck{ID: "d1", Name: "Bio", Color: "#abc", Description: "desc",
		Level: LevelIntermediate, CreatedAt: "2026-04-26T00:00:00Z", UpdatedAt: "2026-04-26T00:00:00Z"}
	if err := r.Create(context.Background(), d); err != nil {
		t.Fatal(err)
	}
	got, err := r.FindByID(context.Background(), "d1")
	if err != nil {
		t.Fatal(err)
	}
	if got.Name != "Bio" || got.Level != LevelIntermediate {
		t.Errorf("roundtrip lost data: %+v", got)
	}
}

func TestSqliteFindByIDMissing(t *testing.T) {
	r, _ := openRepo(t)
	_, err := r.FindByID(context.Background(), "ghost")
	if err != ErrNotFound {
		t.Errorf("want ErrNotFound, got %v", err)
	}
}

func TestSqliteUpdate(t *testing.T) {
	r, _ := openRepo(t)
	d := Deck{ID: "d", Name: "old", Color: "#aaa", Level: LevelBeginner,
		CreatedAt: "t1", UpdatedAt: "t1"}
	_ = r.Create(context.Background(), d)
	d.Name = "new"
	d.UpdatedAt = "t2"
	if err := r.Update(context.Background(), d); err != nil {
		t.Fatal(err)
	}
	got, _ := r.FindByID(context.Background(), "d")
	if got.Name != "new" || got.UpdatedAt != "t2" {
		t.Errorf("update lost: %+v", got)
	}
}

func TestSqliteListOrdersDescByCreatedAt(t *testing.T) {
	r, _ := openRepo(t)
	_ = r.Create(context.Background(), Deck{ID: "a", Name: "A", Level: LevelBeginner, CreatedAt: "2026-01-01T00:00:00Z", UpdatedAt: "x"})
	_ = r.Create(context.Background(), Deck{ID: "b", Name: "B", Level: LevelBeginner, CreatedAt: "2026-04-01T00:00:00Z", UpdatedAt: "x"})
	out, err := r.List(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 2 || out[0].ID != "b" {
		t.Errorf("want newest first, got %+v", out)
	}
}

func TestSqliteDelete(t *testing.T) {
	r, _ := openRepo(t)
	_ = r.Create(context.Background(), Deck{ID: "d", Name: "x", Level: LevelBeginner, CreatedAt: "x", UpdatedAt: "x"})
	if err := r.Delete(context.Background(), "d"); err != nil {
		t.Fatal(err)
	}
	if _, err := r.FindByID(context.Background(), "d"); err != ErrNotFound {
		t.Errorf("want ErrNotFound after delete, got %v", err)
	}
}
