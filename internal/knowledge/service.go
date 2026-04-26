package knowledge

import (
	"context"
	"time"

	"github.com/O6lvl4/memre/internal/platform/clock"
	"github.com/O6lvl4/memre/internal/platform/idgen"
)

type Service struct {
	repo  Repository
	clock clock.Clock
	ids   idgen.Generator
}

func NewService(repo Repository, c clock.Clock, ids idgen.Generator) *Service {
	return &Service{repo: repo, clock: c, ids: ids}
}

type CreateInput struct {
	ID      string
	DeckID  string
	Name    string
	Content string
	Type    SourceType
}

func (s *Service) Create(ctx context.Context, in CreateInput) (Source, error) {
	id := in.ID
	if isBlank(id) {
		id = s.ids.NewID()
	}
	now := s.clock.Now().UTC().Format(time.RFC3339)
	src, err := newSource(id, in.DeckID, in.Name, in.Content, in.Type, now)
	if err != nil {
		return Source{}, err
	}
	if err := s.repo.Create(ctx, src); err != nil {
		return Source{}, err
	}
	return src, nil
}

type UpdateInput struct {
	ID      string
	Name    string
	Content string
	Type    SourceType
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (Source, error) {
	src, err := s.repo.FindByID(ctx, in.ID)
	if err != nil {
		return Source{}, err
	}
	now := s.clock.Now().UTC().Format(time.RFC3339)
	src, err = src.edit(in.Name, in.Content, in.Type, now)
	if err != nil {
		return Source{}, err
	}
	if err := s.repo.Update(ctx, src); err != nil {
		return Source{}, err
	}
	return src, nil
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *Service) ListByDeck(ctx context.Context, deckID string) ([]Source, error) {
	return s.repo.ListByDeck(ctx, deckID)
}
