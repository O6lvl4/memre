package settings

import (
	"context"
	"testing"
)

type memRepo struct{ data map[string]string }

func newMemRepo() *memRepo { return &memRepo{data: map[string]string{}} }

func (r *memRepo) Get(_ context.Context, k string) (string, bool, error) {
	v, ok := r.data[k]
	return v, ok, nil
}
func (r *memRepo) Set(_ context.Context, k, v string) error  { r.data[k] = v; return nil }
func (r *memRepo) Delete(_ context.Context, k string) error  { delete(r.data, k); return nil }
func (r *memRepo) All(_ context.Context) (map[string]string, error) {
	out := make(map[string]string, len(r.data))
	for k, v := range r.data {
		out[k] = v
	}
	return out, nil
}

func TestGetOrFallsBackOnMissing(t *testing.T) {
	svc := NewService(newMemRepo())
	if got := svc.GetOr(context.Background(), KeyAIDefaultProvider, "ollama"); got != "ollama" {
		t.Errorf("want fallback, got %q", got)
	}
}

func TestRoundtrip(t *testing.T) {
	svc := NewService(newMemRepo())
	ctx := context.Background()
	if err := svc.Set(ctx, KeyAIDefaultProvider, "anthropic"); err != nil {
		t.Fatal(err)
	}
	if got, _ := svc.Get(ctx, KeyAIDefaultProvider); got != "anthropic" {
		t.Errorf("want anthropic got %q", got)
	}
	if err := svc.Delete(ctx, KeyAIDefaultProvider); err != nil {
		t.Fatal(err)
	}
	if got, _ := svc.Get(ctx, KeyAIDefaultProvider); got != "" {
		t.Errorf("delete didn't take effect, still %q", got)
	}
}
