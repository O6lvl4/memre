package knowledge

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/O6lvl4/memre/internal/platform/sqlite"
)

const ts2 = "2026-04-26T00:00:00Z"

func openRepoWithDeck(t *testing.T) (*SqliteRepository, *sqlite.Store) {
	t.Helper()
	store, err := sqlite.OpenAt(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })
	_, err = store.DB.Exec(
		`INSERT INTO decks(id,name,color,description,level,created_at,updated_at)
		 VALUES('d1','Test','#abc','','beginner',?,?)`, ts2, ts2)
	if err != nil {
		t.Fatal(err)
	}
	return NewSqliteRepository(store), store
}

func TestKnowledgeRoundtrip(t *testing.T) {
	r, _ := openRepoWithDeck(t)
	s := Source{ID: "s1", DeckID: "d1", Name: "n", Content: "hello",
		Type: SourceText, CreatedAt: ts2, UpdatedAt: ts2}
	if err := r.Create(context.Background(), s); err != nil {
		t.Fatal(err)
	}
	got, err := r.FindByID(context.Background(), "s1")
	if err != nil {
		t.Fatal(err)
	}
	if got.Type != SourceText || got.Content != "hello" {
		t.Errorf("roundtrip lost: %+v", got)
	}
}

func TestKnowledgeForeignKeyEnforced(t *testing.T) {
	r, _ := openRepoWithDeck(t)
	bad := Source{ID: "x", DeckID: "no-deck", Name: "n", Content: "x", Type: SourceText, CreatedAt: ts2, UpdatedAt: ts2}
	if err := r.Create(context.Background(), bad); err == nil {
		t.Fatal("FK violation expected")
	}
}

func TestKnowledgeListByDeck(t *testing.T) {
	r, _ := openRepoWithDeck(t)
	for _, id := range []string{"a", "b", "c"} {
		s := Source{ID: id, DeckID: "d1", Name: id, Content: "x",
			Type: SourceText, CreatedAt: ts2, UpdatedAt: ts2}
		_ = r.Create(context.Background(), s)
	}
	got, err := r.ListByDeck(context.Background(), "d1")
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 3 {
		t.Errorf("want 3 sources, got %d", len(got))
	}
}
