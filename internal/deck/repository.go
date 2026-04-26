package deck

import "context"

// Repository is the consumer-side interface used by Service. The
// concrete sqlite implementation lives next door (sqlite.go) but other
// adapters (in-memory for tests, future remote sync) can satisfy it
// without modifying this file.
type Repository interface {
	Create(ctx context.Context, d Deck) error
	Update(ctx context.Context, d Deck) error
	Delete(ctx context.Context, id string) error
	FindByID(ctx context.Context, id string) (Deck, error)
	List(ctx context.Context) ([]Deck, error)
}
