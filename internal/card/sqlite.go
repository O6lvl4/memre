package card

import (
	"context"
	"database/sql"
	"errors"

	"github.com/O6lvl4/memre/internal/platform/sqlite"
)

type SqliteRepository struct {
	db *sql.DB
}

func NewSqliteRepository(s *sqlite.Store) *SqliteRepository {
	return &SqliteRepository{db: s.DB}
}

var ErrNotFound = errors.New("card not found")

// Create is a true upsert: when the frontend re-saves a card whose id
// already exists (for example, after a review pass that mutates SRS
// state and then triggers a bulk save), we update fields in place
// instead of erroring on the UNIQUE constraint. created_at is preserved
// from the existing row.
func (r *SqliteRepository) Create(ctx context.Context, c Card) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO cards(id,deck_id,question,answer,interval_days,ease_factor,created_at,updated_at)
		 VALUES(?,?,?,?,?,?,?,?)
		 ON CONFLICT(id) DO UPDATE SET
		   deck_id=excluded.deck_id,
		   question=excluded.question,
		   answer=excluded.answer,
		   interval_days=excluded.interval_days,
		   ease_factor=excluded.ease_factor,
		   updated_at=excluded.updated_at`,
		c.ID, c.DeckID, c.Question, c.Answer, c.IntervalDays, c.EaseFactor, c.CreatedAt, c.UpdatedAt,
	)
	return err
}

func (r *SqliteRepository) Update(ctx context.Context, c Card) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE cards SET question=?, answer=?, last_reviewed_date=?, next_review_date=?,
		                  interval_days=?, ease_factor=?, review_count=?, lapse_count=?, updated_at=?
		   WHERE id=?`,
		c.Question, c.Answer, nullable(c.LastReviewedDate), nullable(c.NextReviewDate),
		c.IntervalDays, c.EaseFactor, c.ReviewCount, c.LapseCount, c.UpdatedAt, c.ID,
	)
	return err
}

func nullable(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func (r *SqliteRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM cards WHERE id=?`, id)
	return err
}

func (r *SqliteRepository) FindByID(ctx context.Context, id string) (Card, error) {
	row := r.db.QueryRowContext(ctx, baseSelect+` WHERE id=?`, id)
	var c Card
	if err := row.Scan(&c.ID, &c.DeckID, &c.Question, &c.Answer,
		&c.LastReviewedDate, &c.NextReviewDate, &c.IntervalDays, &c.EaseFactor,
		&c.ReviewCount, &c.LapseCount, &c.CreatedAt, &c.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Card{}, ErrNotFound
		}
		return Card{}, err
	}
	return c, nil
}

func (r *SqliteRepository) ListByDeck(ctx context.Context, deckID string) ([]Card, error) {
	rows, err := r.db.QueryContext(ctx, baseSelect+` WHERE deck_id=? ORDER BY created_at DESC`, deckID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Card
	for rows.Next() {
		var c Card
		if err := rows.Scan(&c.ID, &c.DeckID, &c.Question, &c.Answer,
			&c.LastReviewedDate, &c.NextReviewDate, &c.IntervalDays, &c.EaseFactor,
			&c.ReviewCount, &c.LapseCount, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

const baseSelect = `SELECT id,deck_id,question,answer,
       IFNULL(last_reviewed_date,''),IFNULL(next_review_date,''),
       interval_days,ease_factor,review_count,lapse_count,created_at,updated_at
  FROM cards`
