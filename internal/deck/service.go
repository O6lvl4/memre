package deck

import (
	"context"
	"time"

	"github.com/O6lvl4/memre/internal/card"
	"github.com/O6lvl4/memre/internal/platform/clock"
	"github.com/O6lvl4/memre/internal/platform/idgen"
	"github.com/O6lvl4/memre/internal/srs"
)

// Service is the entrypoint for every Deck operation. Dependencies are
// stored as fields and supplied at construction so tests substitute
// fakes by hand without any DI framework.
type Service struct {
	repo  Repository
	cards card.Repository
	clock clock.Clock
	ids   idgen.Generator
}

func NewService(repo Repository, cards card.Repository, c clock.Clock, ids idgen.Generator) *Service {
	return &Service{repo: repo, cards: cards, clock: c, ids: ids}
}

type CreateInput struct {
	ID          string
	Name        string
	Color       string
	Description string
	Level       Level
}

func (s *Service) Create(ctx context.Context, in CreateInput) (Deck, error) {
	id := in.ID
	if isBlank(id) {
		id = s.ids.NewID()
	}
	now := s.clock.Now().UTC().Format(time.RFC3339)
	d, err := newDeck(id, in.Name, in.Color, in.Description, in.Level, now)
	if err != nil {
		return Deck{}, err
	}
	if err := s.repo.Create(ctx, d); err != nil {
		return Deck{}, err
	}
	return d, nil
}

type UpdateInput struct {
	ID          string
	Name        string
	Color       string
	Description string
	Level       Level
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (Deck, error) {
	d, err := s.repo.FindByID(ctx, in.ID)
	if err != nil {
		return Deck{}, err
	}
	now := s.clock.Now().UTC().Format(time.RFC3339)
	d, err = d.rename(in.Name, now)
	if err != nil {
		return Deck{}, err
	}
	d, err = d.withDetails(in.Color, in.Description, in.Level, now)
	if err != nil {
		return Deck{}, err
	}
	if err := s.repo.Update(ctx, d); err != nil {
		return Deck{}, err
	}
	return d, nil
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *Service) List(ctx context.Context) ([]WithStats, error) {
	decks, err := s.repo.List(ctx)
	if err != nil {
		return nil, err
	}
	now := s.clock.Now().UTC()
	out := make([]WithStats, 0, len(decks))
	for _, d := range decks {
		cs, err := s.cards.ListByDeck(ctx, d.ID)
		if err != nil {
			return nil, err
		}
		out = append(out, WithStats{Deck: d, Stats: deckStats(cs, now)})
	}
	return out, nil
}

func deckStats(cards []card.Card, now time.Time) Stats {
	s := Stats{TotalCards: len(cards)}
	if s.TotalCards == 0 {
		return s
	}
	var sumRet float64
	reviewed := 0
	for _, c := range cards {
		if c.IsNew() {
			s.NewCount++
			continue
		}
		if c.IsDue(now) {
			s.DueCount++
		}
		if t, err := time.Parse(time.RFC3339, c.LastReviewedDate); err == nil {
			days := now.Sub(t).Hours() / 24
			sumRet += srs.RetentionRate(days, c.IntervalDays, true)
			reviewed++
		}
	}
	if reviewed > 0 {
		s.RetentionRate = sumRet / float64(reviewed)
	}
	return s
}
