package knowledge

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

var ErrNotFound = errors.New("knowledge source not found")

// Create is a true upsert (see card/sqlite.go for rationale).
func (r *SqliteRepository) Create(ctx context.Context, s Source) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO knowledge_sources(id,deck_id,name,content,type,created_at,updated_at)
		 VALUES(?,?,?,?,?,?,?)
		 ON CONFLICT(id) DO UPDATE SET
		   name=excluded.name,
		   content=excluded.content,
		   type=excluded.type,
		   updated_at=excluded.updated_at`,
		s.ID, s.DeckID, s.Name, s.Content, string(s.Type), s.CreatedAt, s.UpdatedAt,
	)
	return err
}

func (r *SqliteRepository) Update(ctx context.Context, s Source) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE knowledge_sources SET name=?, content=?, type=?, updated_at=? WHERE id=?`,
		s.Name, s.Content, string(s.Type), s.UpdatedAt, s.ID,
	)
	return err
}

func (r *SqliteRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM knowledge_sources WHERE id=?`, id)
	return err
}

func (r *SqliteRepository) FindByID(ctx context.Context, id string) (Source, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id,deck_id,name,content,type,created_at,updated_at FROM knowledge_sources WHERE id=?`, id)
	var s Source
	var t string
	if err := row.Scan(&s.ID, &s.DeckID, &s.Name, &s.Content, &t, &s.CreatedAt, &s.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Source{}, ErrNotFound
		}
		return Source{}, err
	}
	s.Type = SourceType(t)
	if err := s.Validate(); err != nil {
		return Source{}, err
	}
	return s, nil
}

func (r *SqliteRepository) ListByDeck(ctx context.Context, deckID string) ([]Source, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id,deck_id,name,content,type,created_at,updated_at
		   FROM knowledge_sources WHERE deck_id=? ORDER BY created_at DESC`, deckID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Source
	for rows.Next() {
		var s Source
		var t string
		if err := rows.Scan(&s.ID, &s.DeckID, &s.Name, &s.Content, &t, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		s.Type = SourceType(t)
		if err := s.Validate(); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}
