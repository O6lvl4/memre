package knowledge

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/O6lvl4/memre/internal/platform/clock"
	"github.com/O6lvl4/memre/internal/platform/idgen"
)

type memRepo struct{ data map[string]Source }

func newMemRepo() *memRepo { return &memRepo{data: map[string]Source{}} }

func (r *memRepo) Create(_ context.Context, s Source) error  { r.data[s.ID] = s; return nil }
func (r *memRepo) Update(_ context.Context, s Source) error  { r.data[s.ID] = s; return nil }
func (r *memRepo) Delete(_ context.Context, id string) error { delete(r.data, id); return nil }
func (r *memRepo) FindByID(_ context.Context, id string) (Source, error) {
	if s, ok := r.data[id]; ok {
		return s, nil
	}
	return Source{}, errors.New("not found")
}
func (r *memRepo) ListByDeck(_ context.Context, deckID string) ([]Source, error) {
	var out []Source
	for _, s := range r.data {
		if s.DeckID == deckID {
			out = append(out, s)
		}
	}
	return out, nil
}

func newSvc() (*Service, *memRepo) {
	r := newMemRepo()
	clk := clock.NewFake(time.Date(2026, 4, 26, 0, 0, 0, 0, time.UTC))
	return NewService(r, clk, idgen.NewSequential("s-")), r
}

func TestServiceCreatePersists(t *testing.T) {
	svc, r := newSvc()
	out, err := svc.Create(context.Background(), CreateInput{
		DeckID: "d1", Name: "ref", Content: "...", Type: SourceText,
	})
	if err != nil {
		t.Fatal(err)
	}
	if out.ID != "s-1" {
		t.Errorf("want s-1 got %q", out.ID)
	}
	if _, ok := r.data["s-1"]; !ok {
		t.Error("not persisted")
	}
}

func TestServiceCreateRejectsBadInput(t *testing.T) {
	svc, _ := newSvc()
	if _, err := svc.Create(context.Background(), CreateInput{Name: "x"}); err == nil {
		t.Error("missing deck should fail")
	}
}

func TestServiceUpdate(t *testing.T) {
	svc, _ := newSvc()
	s, _ := svc.Create(context.Background(), CreateInput{DeckID: "d", Name: "n", Content: "c", Type: SourceText})
	out, err := svc.Update(context.Background(), UpdateInput{ID: s.ID, Name: "n2", Content: "c2", Type: SourceFile})
	if err != nil {
		t.Fatal(err)
	}
	if out.Type != SourceFile || out.Content != "c2" {
		t.Errorf("update did not apply: %+v", out)
	}
}

func TestServiceListByDeckFiltersCorrectly(t *testing.T) {
	svc, _ := newSvc()
	_, _ = svc.Create(context.Background(), CreateInput{DeckID: "a", Name: "1", Content: "x"})
	_, _ = svc.Create(context.Background(), CreateInput{DeckID: "a", Name: "2", Content: "y"})
	_, _ = svc.Create(context.Background(), CreateInput{DeckID: "b", Name: "3", Content: "z"})

	got, err := svc.ListByDeck(context.Background(), "a")
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 {
		t.Errorf("want 2 sources for deck a, got %d", len(got))
	}
}
