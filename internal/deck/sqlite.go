package deck

import (
	"context"
	"database/sql"
	"errors"

	"github.com/O6lvl4/memre/internal/platform/sqlite"
)

// SqliteRepository implements Repository against the shared SQLite store.
// Kept in the same package as the entity (vertical slice) so the storage
// shape and the domain stay close enough to refactor together.
type SqliteRepository struct {
	db *sql.DB
}

func NewSqliteRepository(s *sqlite.Store) *SqliteRepository {
	return &SqliteRepository{db: s.DB}
}

var ErrNotFound = errors.New("deck not found")

func (r *SqliteRepository) Create(ctx context.Context, d Deck) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO decks(id,name,color,description,level,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`,
		d.ID, d.Name, d.Color, d.Description, string(d.Level), d.CreatedAt, d.UpdatedAt,
	)
	return err
}

func (r *SqliteRepository) Update(ctx context.Context, d Deck) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE decks SET name=?, color=?, description=?, level=?, updated_at=? WHERE id=?`,
		d.Name, d.Color, d.Description, string(d.Level), d.UpdatedAt, d.ID,
	)
	return err
}

func (r *SqliteRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM decks WHERE id=?`, id)
	return err
}

func (r *SqliteRepository) FindByID(ctx context.Context, id string) (Deck, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id,name,color,description,level,created_at,updated_at FROM decks WHERE id=?`, id)
	var d Deck
	var lvl string
	if err := row.Scan(&d.ID, &d.Name, &d.Color, &d.Description, &lvl, &d.CreatedAt, &d.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Deck{}, ErrNotFound
		}
		return Deck{}, err
	}
	d.Level = Level(lvl)
	return d, nil
}

func (r *SqliteRepository) List(ctx context.Context) ([]Deck, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id,name,color,description,level,created_at,updated_at FROM decks ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Deck
	for rows.Next() {
		var d Deck
		var lvl string
		if err := rows.Scan(&d.ID, &d.Name, &d.Color, &d.Description, &lvl, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		d.Level = Level(lvl)
		out = append(out, d)
	}
	return out, rows.Err()
}
