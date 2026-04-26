package deck

import (
	"context"
	"time"

	"github.com/O6lvl4/memre/internal/platform/clock"
	"github.com/O6lvl4/memre/internal/platform/idgen"
)

// Service is the entrypoint for every Deck operation. It depends on a
// per-deck Repository plus a *read-model* StatsRepository — so it never
// has to reach into the Card aggregate to compute deck-level views.
type Service struct {
	repo  Repository
	stats StatsRepository
	clock clock.Clock
	ids   idgen.Generator
}

func NewService(repo Repository, stats StatsRepository, c clock.Clock, ids idgen.Generator) *Service {
	return &Service{repo: repo, stats: stats, clock: c, ids: ids}
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
	out := make([]WithStats, 0, len(decks))
	for _, d := range decks {
		st, err := s.stats.ForDeck(ctx, d.ID)
		if err != nil {
			return nil, err
		}
		out = append(out, WithStats{Deck: d, Stats: st})
	}
	return out, nil
}

// keep `time` import busy in case future deck logic needs it
var _ = time.Now
