package card

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
	// FK requires deck row to exist before we can write cards
	_, err = store.DB.Exec(
		`INSERT INTO decks(id,name,color,description,level,created_at,updated_at)
		 VALUES('d1','Test','#abc','','beginner',?,?)`, ts2, ts2)
	if err != nil {
		t.Fatal(err)
	}
	return NewSqliteRepository(store), store
}

func TestCardSqliteRoundtrip(t *testing.T) {
	r, _ := openRepoWithDeck(t)
	c := Card{ID: "c1", DeckID: "d1", Question: "Q", Answer: "A",
		EaseFactor: 2.5, CreatedAt: ts2, UpdatedAt: ts2}
	if err := r.Create(context.Background(), c); err != nil {
		t.Fatal(err)
	}
	got, err := r.FindByID(context.Background(), "c1")
	if err != nil {
		t.Fatal(err)
	}
	if got.DeckID != "d1" || got.Question != "Q" || got.EaseFactor != 2.5 {
		t.Errorf("roundtrip lost: %+v", got)
	}
}

func TestCardCreateIsUpsert(t *testing.T) {
	// The frontend's bulk-save path can call Create twice for the same
	// card id (once at creation, once after a review). The second call
	// must succeed and reflect the updated fields rather than failing
	// on UNIQUE constraint.
	r, _ := openRepoWithDeck(t)
	c1 := Card{ID: "c1", DeckID: "d1", Question: "Q1", Answer: "A1",
		EaseFactor: 2.5, CreatedAt: ts2, UpdatedAt: ts2}
	if err := r.Create(context.Background(), c1); err != nil {
		t.Fatal(err)
	}
	c2 := c1
	c2.Question = "Q2"
	c2.Answer = "A2"
	c2.UpdatedAt = "2026-04-27T00:00:00Z"
	if err := r.Create(context.Background(), c2); err != nil {
		t.Fatalf("second Create should upsert, got %v", err)
	}
	got, _ := r.FindByID(context.Background(), "c1")
	if got.Question != "Q2" || got.Answer != "A2" {
		t.Errorf("upsert did not apply new fields: %+v", got)
	}
	if got.CreatedAt != ts2 {
		t.Errorf("upsert should preserve created_at, got %q", got.CreatedAt)
	}
}

func TestCardForeignKeyEnforced(t *testing.T) {
	r, _ := openRepoWithDeck(t)
	bad := Card{ID: "x", DeckID: "no-such-deck", Question: "Q", Answer: "A",
		EaseFactor: 2.5, CreatedAt: ts2, UpdatedAt: ts2}
	if err := r.Create(context.Background(), bad); err == nil {
		t.Fatal("FK violation expected")
	}
}

func TestCardCascadeOnDeckDelete(t *testing.T) {
	r, store := openRepoWithDeck(t)
	c := Card{ID: "c", DeckID: "d1", Question: "Q", Answer: "A",
		EaseFactor: 2.5, CreatedAt: ts2, UpdatedAt: ts2}
	_ = r.Create(context.Background(), c)

	if _, err := store.DB.Exec(`DELETE FROM decks WHERE id='d1'`); err != nil {
		t.Fatal(err)
	}
	got, _ := r.ListByDeck(context.Background(), "d1")
	if len(got) != 0 {
		t.Errorf("ON DELETE CASCADE failed; %d cards remain", len(got))
	}
}

func TestCardUpdatePreservesNullableTimestamps(t *testing.T) {
	r, _ := openRepoWithDeck(t)
	c := Card{ID: "c", DeckID: "d1", Question: "Q", Answer: "A",
		EaseFactor: 2.5, CreatedAt: ts2, UpdatedAt: ts2}
	_ = r.Create(context.Background(), c)

	// Simulate a review: schedule populated.
	c.LastReviewedDate = "2026-04-27T00:00:00Z"
	c.NextReviewDate = "2026-04-28T00:00:00Z"
	c.IntervalDays = 1
	c.ReviewCount = 1
	c.UpdatedAt = "2026-04-27T00:00:00Z"
	if err := r.Update(context.Background(), c); err != nil {
		t.Fatal(err)
	}
	got, _ := r.FindByID(context.Background(), "c")
	if got.LastReviewedDate == "" || got.NextReviewDate == "" || got.ReviewCount != 1 {
		t.Errorf("update lost SRS state: %+v", got)
	}

	// And clearing them back to empty must persist as NULL → returned as "".
	got.LastReviewedDate = ""
	got.NextReviewDate = ""
	if err := r.Update(context.Background(), got); err != nil {
		t.Fatal(err)
	}
	got2, _ := r.FindByID(context.Background(), "c")
	if got2.LastReviewedDate != "" || got2.NextReviewDate != "" {
		t.Errorf("clearing schedule failed: %+v", got2)
	}
}
