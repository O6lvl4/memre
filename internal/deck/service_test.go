package deck

import (
	"context"
	"testing"
	"time"

	"github.com/O6lvl4/memre/internal/card"
	"github.com/O6lvl4/memre/internal/platform/clock"
	"github.com/O6lvl4/memre/internal/platform/idgen"
)

// in-memory Repository purely for service tests
type memRepo struct {
	data map[string]Deck
}

func newMemRepo() *memRepo { return &memRepo{data: map[string]Deck{}} }

func (r *memRepo) Create(_ context.Context, d Deck) error           { r.data[d.ID] = d; return nil }
func (r *memRepo) Update(_ context.Context, d Deck) error           { r.data[d.ID] = d; return nil }
func (r *memRepo) Delete(_ context.Context, id string) error        { delete(r.data, id); return nil }
func (r *memRepo) FindByID(_ context.Context, id string) (Deck, error) {
	if d, ok := r.data[id]; ok {
		return d, nil
	}
	return Deck{}, ErrEmptyName // any sentinel is fine for the test
}
func (r *memRepo) List(_ context.Context) ([]Deck, error) {
	out := make([]Deck, 0, len(r.data))
	for _, d := range r.data {
		out = append(out, d)
	}
	return out, nil
}

// in-memory CardRepository — only ListByDeck is exercised by deck.Service
type memCardRepo struct{ m map[string][]card.Card }

func (r *memCardRepo) Create(context.Context, card.Card) error { return nil }
func (r *memCardRepo) Update(context.Context, card.Card) error { return nil }
func (r *memCardRepo) Delete(context.Context, string) error    { return nil }
func (r *memCardRepo) FindByID(context.Context, string) (card.Card, error) {
	return card.Card{}, nil
}
func (r *memCardRepo) ListByDeck(_ context.Context, id string) ([]card.Card, error) {
	return r.m[id], nil
}

func newSvc() (*Service, *memRepo, *memCardRepo, *clock.Fake) {
	dr := newMemRepo()
	cr := &memCardRepo{m: map[string][]card.Card{}}
	clk := clock.NewFake(time.Date(2026, 4, 26, 0, 0, 0, 0, time.UTC))
	ids := idgen.NewSequential("d-")
	return NewService(dr, cr, clk, ids), dr, cr, clk
}

func TestServiceCreateUsesIDGenWhenBlank(t *testing.T) {
	svc, dr, _, _ := newSvc()
	d, err := svc.Create(context.Background(), CreateInput{Name: "X"})
	if err != nil {
		t.Fatal(err)
	}
	if d.ID != "d-1" {
		t.Errorf("expected sequential id d-1, got %q", d.ID)
	}
	if _, ok := dr.data["d-1"]; !ok {
		t.Error("repository should hold the new deck")
	}
}

func TestServiceCreateRespectsCallerID(t *testing.T) {
	svc, _, _, _ := newSvc()
	d, err := svc.Create(context.Background(), CreateInput{ID: "fixed", Name: "X"})
	if err != nil {
		t.Fatal(err)
	}
	if d.ID != "fixed" {
		t.Errorf("caller id should win, got %q", d.ID)
	}
}

func TestServiceCreateRejectsBadInput(t *testing.T) {
	svc, _, _, _ := newSvc()
	if _, err := svc.Create(context.Background(), CreateInput{Name: ""}); err == nil {
		t.Error("expected error on empty name")
	}
}

func TestServiceUpdateBumpsTimestamp(t *testing.T) {
	svc, dr, _, clk := newSvc()
	d, _ := svc.Create(context.Background(), CreateInput{ID: "id", Name: "old"})
	clk.Advance(2 * time.Hour)

	d2, err := svc.Update(context.Background(), UpdateInput{
		ID: d.ID, Name: "new", Color: "#fff", Description: "desc", Level: LevelAdvanced,
	})
	if err != nil {
		t.Fatal(err)
	}
	if d2.Name != "new" || d2.Level != LevelAdvanced {
		t.Errorf("update did not apply: %+v", d2)
	}
	if d2.UpdatedAt == d.UpdatedAt {
		t.Error("UpdatedAt should change")
	}
	if dr.data["id"].Name != "new" {
		t.Error("repository did not see the update")
	}
}

func TestServiceListProducesStats(t *testing.T) {
	svc, _, cr, clk := newSvc()
	_, _ = svc.Create(context.Background(), CreateInput{ID: "d1", Name: "X"})

	now := clk.Now()
	cr.m["d1"] = []card.Card{
		{ID: "c1", DeckID: "d1"}, // new card
		{
			ID: "c2", DeckID: "d1",
			LastReviewedDate: now.Add(-2 * 24 * time.Hour).Format(time.RFC3339),
			NextReviewDate:   now.Add(-24 * time.Hour).Format(time.RFC3339), // due
			IntervalDays:     1,
		},
	}

	out, err := svc.List(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 1 {
		t.Fatalf("want 1 deck got %d", len(out))
	}
	stats := out[0].Stats
	if stats.TotalCards != 2 || stats.NewCount != 1 || stats.DueCount != 1 {
		t.Errorf("unexpected stats: %+v", stats)
	}
}
