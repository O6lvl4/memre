package settings

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/O6lvl4/memre/internal/platform/sqlite"
)

func openRepo(t *testing.T) *SqliteRepository {
	t.Helper()
	store, err := sqlite.OpenAt(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })
	return NewSqliteRepository(store)
}

func TestSqliteSetGet(t *testing.T) {
	r := openRepo(t)
	if err := r.Set(context.Background(), KeyAIDefaultProvider, "anthropic"); err != nil {
		t.Fatal(err)
	}
	v, ok, err := r.Get(context.Background(), KeyAIDefaultProvider)
	if err != nil {
		t.Fatal(err)
	}
	if !ok || v != "anthropic" {
		t.Errorf("want anthropic got %q ok=%v", v, ok)
	}
}

func TestSqliteSetIsUpsert(t *testing.T) {
	r := openRepo(t)
	_ = r.Set(context.Background(), KeyAIDefaultModel, "model-a")
	_ = r.Set(context.Background(), KeyAIDefaultModel, "model-b")
	v, _, _ := r.Get(context.Background(), KeyAIDefaultModel)
	if v != "model-b" {
		t.Errorf("upsert failed, got %q", v)
	}
}

func TestSqliteGetMissing(t *testing.T) {
	r := openRepo(t)
	_, ok, err := r.Get(context.Background(), "ghost.key")
	if err != nil {
		t.Fatal(err)
	}
	if ok {
		t.Error("missing key should return ok=false")
	}
}

func TestSqliteAll(t *testing.T) {
	r := openRepo(t)
	_ = r.Set(context.Background(), "a", "1")
	_ = r.Set(context.Background(), "b", "2")
	all, err := r.All(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if all["a"] != "1" || all["b"] != "2" {
		t.Errorf("All() lost data: %+v", all)
	}
}
