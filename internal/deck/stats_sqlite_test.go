package deck

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/O6lvl4/memre/internal/platform/clock"
	"github.com/O6lvl4/memre/internal/platform/sqlite"
)

func openStatsRepo(t *testing.T) (*SqliteStatsRepository, *sqlite.Store, *clock.Fake) {
	t.Helper()
	store, err := sqlite.OpenAt(filepath.Join(t.TempDir(), "stats.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })
	clk := clock.NewFake(time.Date(2026, 4, 26, 0, 0, 0, 0, time.UTC))
	return NewSqliteStatsRepository(store, clk), store, clk
}

func TestStatsRepoEmptyDeck(t *testing.T) {
	r, _, _ := openStatsRepo(t)
	got, err := r.ForDeck(context.Background(), "ghost")
	if err != nil {
		t.Fatal(err)
	}
	if got != (Stats{}) {
		t.Errorf("empty deck should return zero Stats, got %+v", got)
	}
}

func TestStatsRepoCountsNewDueAndRetention(t *testing.T) {
	r, store, clk := openStatsRepo(t)
	now := clk.Now().UTC()
	_, err := store.DB.Exec(
		`INSERT INTO decks(id,name,color,description,level,created_at,updated_at)
		 VALUES('d1','X','#abc','','beginner',?,?)`,
		now.Format(time.RFC3339), now.Format(time.RFC3339))
	if err != nil {
		t.Fatal(err)
	}

	// One new card, one due card, one not-yet-due card.
	insert := func(id, last, next string, interval float64) {
		_, err := store.DB.Exec(`
INSERT INTO cards(id,deck_id,question,answer,
                  last_reviewed_date,next_review_date,
                  interval_days,ease_factor,review_count,lapse_count,
                  created_at,updated_at)
VALUES(?,?,?,?,?,?,?,2.5,0,0,?,?)`,
			id, "d1", "Q", "A",
			nullable(last), nullable(next),
			interval,
			now.Format(time.RFC3339), now.Format(time.RFC3339),
		)
		if err != nil {
			t.Fatal(err)
		}
	}
	insert("c-new", "", "", 0)
	insert("c-due",
		now.Add(-2*24*time.Hour).Format(time.RFC3339),
		now.Add(-24*time.Hour).Format(time.RFC3339),
		1)
	insert("c-future",
		now.Add(-1*time.Hour).Format(time.RFC3339),
		now.Add(7*24*time.Hour).Format(time.RFC3339),
		7)

	got, err := r.ForDeck(context.Background(), "d1")
	if err != nil {
		t.Fatal(err)
	}
	if got.TotalCards != 3 {
		t.Errorf("TotalCards want 3 got %d", got.TotalCards)
	}
	if got.NewCount != 1 {
		t.Errorf("NewCount want 1 got %d", got.NewCount)
	}
	if got.DueCount != 1 {
		t.Errorf("DueCount want 1 got %d", got.DueCount)
	}
	if got.RetentionRate <= 0 {
		t.Errorf("RetentionRate should be >0 with 2 reviewed cards, got %v", got.RetentionRate)
	}
}

func nullable(s string) any {
	if s == "" {
		return nil
	}
	return s
}
