package card

import (
	"context"
	"time"

	"github.com/O6lvl4/memre/internal/events"
	"github.com/O6lvl4/memre/internal/platform/clock"
	"github.com/O6lvl4/memre/internal/platform/idgen"
	"github.com/O6lvl4/memre/internal/srs"
)

type Service struct {
	repo   Repository
	clock  clock.Clock
	ids    idgen.Generator
	events events.Publisher
}

func NewService(repo Repository, c clock.Clock, ids idgen.Generator, pub events.Publisher) *Service {
	if pub == nil {
		pub = events.Noop{}
	}
	return &Service{repo: repo, clock: c, ids: ids, events: pub}
}

type CreateInput struct {
	ID       string
	DeckID   string
	Question string
	Answer   string
}

func (s *Service) Create(ctx context.Context, in CreateInput) (Card, error) {
	id := in.ID
	if isBlank(id) {
		id = s.ids.NewID()
	}
	now := s.clock.Now().UTC().Format(time.RFC3339)
	c, err := newCard(id, in.DeckID, in.Question, in.Answer, now)
	if err != nil {
		return Card{}, err
	}
	if err := s.repo.Create(ctx, c); err != nil {
		return Card{}, err
	}
	return c, nil
}

type UpdateInput struct {
	ID       string
	Question string
	Answer   string
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (Card, error) {
	c, err := s.repo.FindByID(ctx, in.ID)
	if err != nil {
		return Card{}, err
	}
	now := s.clock.Now().UTC().Format(time.RFC3339)
	c, err = c.editQA(in.Question, in.Answer, now)
	if err != nil {
		return Card{}, err
	}
	if err := s.repo.Update(ctx, c); err != nil {
		return Card{}, err
	}
	return c, nil
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *Service) ListByDeck(ctx context.Context, deckID string) ([]Card, error) {
	return s.repo.ListByDeck(ctx, deckID)
}

// Review records a rating for the given card and re-schedules it via the
// SRS kernel.
func (s *Service) Review(ctx context.Context, cardID string, rating srs.Rating) (Card, error) {
	if !rating.Valid() {
		return Card{}, ErrInvalidRating
	}
	c, err := s.repo.FindByID(ctx, cardID)
	if err != nil {
		return Card{}, err
	}
	c = c.applyReview(rating, s.clock.Now())
	if err := s.repo.Update(ctx, c); err != nil {
		return Card{}, err
	}
	s.events.Publish(ctx, Reviewed{
		CardID:         c.ID,
		DeckID:         c.DeckID,
		Rating:         rating,
		ReviewedAtUTC:  c.LastReviewedDate,
		NewIntervalDay: c.IntervalDays,
	})
	return c, nil
}

