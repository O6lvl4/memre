package card

import "context"

type Repository interface {
	Create(ctx context.Context, c Card) error
	Update(ctx context.Context, c Card) error
	Delete(ctx context.Context, id string) error
	FindByID(ctx context.Context, id string) (Card, error)
	ListByDeck(ctx context.Context, deckID string) ([]Card, error)
}
