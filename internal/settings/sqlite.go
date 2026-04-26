package settings

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

func (r *SqliteRepository) Get(ctx context.Context, key string) (string, bool, error) {
	row := r.db.QueryRowContext(ctx, `SELECT value FROM settings WHERE key=?`, key)
	var v string
	err := row.Scan(&v)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return v, true, nil
}

func (r *SqliteRepository) Set(ctx context.Context, key, value string) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO settings(key,value) VALUES(?,?)
		 ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
		key, value,
	)
	return err
}

func (r *SqliteRepository) Delete(ctx context.Context, key string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM settings WHERE key=?`, key)
	return err
}

func (r *SqliteRepository) All(ctx context.Context) (map[string]string, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT key,value FROM settings`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]string{}
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		out[k] = v
	}
	return out, rows.Err()
}
