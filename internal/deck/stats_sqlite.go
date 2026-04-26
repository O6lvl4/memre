package deck

import (
	"context"
	"database/sql"
	"time"

	"github.com/O6lvl4/memre/internal/platform/clock"
	"github.com/O6lvl4/memre/internal/platform/sqlite"
	"github.com/O6lvl4/memre/internal/srs"
)

// SqliteStatsRepository computes Stats by querying the cards table
// directly. No Card domain object is constructed — only the columns
// needed for aggregation are pulled, so the read path stays light.
type SqliteStatsRepository struct {
	db    *sql.DB
	clock clock.Clock
}

func NewSqliteStatsRepository(s *sqlite.Store, c clock.Clock) *SqliteStatsRepository {
	if c == nil {
		c = clock.System{}
	}
	return &SqliteStatsRepository{db: s.DB, clock: c}
}

func (r *SqliteStatsRepository) ForDeck(ctx context.Context, deckID string) (Stats, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT IFNULL(last_reviewed_date,''), IFNULL(next_review_date,''), interval_days
		   FROM cards WHERE deck_id=?`, deckID)
	if err != nil {
		return Stats{}, err
	}
	defer rows.Close()

	now := r.clock.Now().UTC()
	var s Stats
	var sumRet float64
	var reviewed int
	for rows.Next() {
		var lastReviewed, nextReview string
		var intervalDays float64
		if err := rows.Scan(&lastReviewed, &nextReview, &intervalDays); err != nil {
			return Stats{}, err
		}
		s.TotalCards++
		if lastReviewed == "" {
			s.NewCount++
			continue
		}
		if nextReview != "" {
			if t, err := time.Parse(time.RFC3339, nextReview); err == nil && !now.Before(t) {
				s.DueCount++
			}
		}
		if t, err := time.Parse(time.RFC3339, lastReviewed); err == nil {
			days := now.Sub(t).Hours() / 24
			sumRet += srs.RetentionRate(days, intervalDays, true)
			reviewed++
		}
	}
	if err := rows.Err(); err != nil {
		return Stats{}, err
	}
	if reviewed > 0 {
		s.RetentionRate = sumRet / float64(reviewed)
	}
	return s, nil
}
