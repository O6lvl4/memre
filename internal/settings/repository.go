package settings

import "context"

type Repository interface {
	Get(ctx context.Context, key string) (string, bool, error)
	Set(ctx context.Context, key, value string) error
	Delete(ctx context.Context, key string) error
	All(ctx context.Context) (map[string]string, error)
}
