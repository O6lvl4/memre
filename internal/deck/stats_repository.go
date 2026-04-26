package deck

import "context"

// StatsRepository is a *read model* port: it produces per-deck statistics
// without exposing the full Card aggregate to the deck context. This
// keeps the aggregate boundary clean — deck.Service no longer reaches
// into card.Repository.
//
// The default sqlite implementation lives in stats_sqlite.go and
// computes stats with one SQL query per deck. A future implementation
// could maintain a materialised view if the live computation becomes
// hot.
type StatsRepository interface {
	// ForDeck returns aggregate counts + retention for a single deck.
	// An empty deck (no cards) returns zero-valued Stats with no error.
	ForDeck(ctx context.Context, deckID string) (Stats, error)
}
