package card

import (
	"github.com/O6lvl4/memre/internal/srs"
)

// Reviewed is published every time a card finishes a review pass.
// Subscribers can use it to update aggregated stats, gamification
// counters, achievements, etc. — without the card service having to
// know about any of those concerns.
type Reviewed struct {
	CardID         string
	DeckID         string
	Rating         srs.Rating
	ReviewedAtUTC  string  // RFC3339 UTC, matches Card.LastReviewedDate
	NewIntervalDay float64 // result of the SRS pass
}

func (Reviewed) EventName() string { return "card.Reviewed" }
