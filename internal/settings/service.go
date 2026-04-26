package settings

import "context"

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service { return &Service{repo: repo} }

// Get returns "" when the key is unset; callers can substitute defaults
// without distinguishing "not present" from "explicitly empty".
func (s *Service) Get(ctx context.Context, key string) (string, error) {
	v, _, err := s.repo.Get(ctx, key)
	return v, err
}

// GetOr returns the stored value or `def` when the key is unset.
func (s *Service) GetOr(ctx context.Context, key, def string) string {
	v, ok, err := s.repo.Get(ctx, key)
	if err != nil || !ok {
		return def
	}
	return v
}

func (s *Service) Set(ctx context.Context, key, value string) error {
	return s.repo.Set(ctx, key, value)
}

func (s *Service) Delete(ctx context.Context, key string) error {
	return s.repo.Delete(ctx, key)
}

func (s *Service) All(ctx context.Context) (map[string]string, error) {
	return s.repo.All(ctx)
}
