package card

import (
	"context"
	"testing"
	"time"

	"github.com/O6lvl4/memre/internal/platform/clock"
	"github.com/O6lvl4/memre/internal/platform/idgen"
	"github.com/O6lvl4/memre/internal/srs"
)

type memRepo struct{ data map[string]Card }

func newMemRepo() *memRepo { return &memRepo{data: map[string]Card{}} }

func (r *memRepo) Create(_ context.Context, c Card) error    { r.data[c.ID] = c; return nil }
func (r *memRepo) Update(_ context.Context, c Card) error    { r.data[c.ID] = c; return nil }
func (r *memRepo) Delete(_ context.Context, id string) error { delete(r.data, id); return nil }
func (r *memRepo) FindByID(_ context.Context, id string) (Card, error) {
	if c, ok := r.data[id]; ok {
		return c, nil
	}
	return Card{}, ErrNotFound // exported sentinel from card/sqlite.go
}
func (r *memRepo) ListByDeck(_ context.Context, deckID string) ([]Card, error) {
	out := []Card{}
	for _, c := range r.data {
		if c.DeckID == deckID {
			out = append(out, c)
		}
	}
	return out, nil
}

func newSvc() (*Service, *memRepo, *clock.Fake) {
	r := newMemRepo()
	clk := clock.NewFake(time.Date(2026, 4, 26, 0, 0, 0, 0, time.UTC))
	ids := idgen.NewSequential("c-")
	return NewService(r, clk, ids), r, clk
}

func TestCreateAssignsIDFromGen(t *testing.T) {
	svc, r, _ := newSvc()
	c, err := svc.Create(context.Background(), CreateInput{DeckID: "d1", Question: "Q", Answer: "A"})
	if err != nil {
		t.Fatal(err)
	}
	if c.ID != "c-1" {
		t.Errorf("want sequential id c-1 got %q", c.ID)
	}
	if _, ok := r.data["c-1"]; !ok {
		t.Error("card not persisted")
	}
}

func TestCreateRejectsMissingFields(t *testing.T) {
	svc, _, _ := newSvc()
	if _, err := svc.Create(context.Background(), CreateInput{DeckID: "d", Question: "", Answer: "a"}); err == nil {
		t.Error("empty Q should fail")
	}
	if _, err := svc.Create(context.Background(), CreateInput{Question: "q", Answer: "a"}); err == nil {
		t.Error("missing deck should fail")
	}
}

func TestReviewSchedulesNextDate(t *testing.T) {
	svc, r, clk := newSvc()
	c, _ := svc.Create(context.Background(), CreateInput{DeckID: "d", Question: "Q", Answer: "A"})

	clk.Advance(time.Hour)
	out, err := svc.Review(context.Background(), c.ID, srs.Good)
	if err != nil {
		t.Fatal(err)
	}
	if out.LastReviewedDate == "" || out.NextReviewDate == "" {
		t.Errorf("review should set timestamps: %+v", out)
	}
	if r.data[c.ID].ReviewCount != 1 {
		t.Errorf("repo should have ReviewCount=1, got %d", r.data[c.ID].ReviewCount)
	}
}

func TestReviewRejectsInvalidRating(t *testing.T) {
	svc, _, _ := newSvc()
	if _, err := svc.Review(context.Background(), "x", srs.Rating("smug")); err != ErrInvalidRating {
		t.Errorf("want ErrInvalidRating, got %v", err)
	}
}
