package knowledge

import "context"

type Repository interface {
	Create(ctx context.Context, s Source) error
	Update(ctx context.Context, s Source) error
	Delete(ctx context.Context, id string) error
	FindByID(ctx context.Context, id string) (Source, error)
	ListByDeck(ctx context.Context, deckID string) ([]Source, error)
}
