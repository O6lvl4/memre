package ai

import "context"

// Fallback wraps another Provider and falls back to Stub for any
// method that errors. It is registered as ProviderID="ollama" / etc to
// keep the UI's notion of "Ollama" stable even when we're transparently
// degrading to the stub. Status is delegated unchanged so the UI sees
// the real connectivity state.
type Fallback struct {
	primary Provider
	stub    Provider
}

func NewFallback(primary Provider) *Fallback {
	return &Fallback{primary: primary, stub: NewStub()}
}

func (f *Fallback) Status(ctx context.Context) Status {
	return f.primary.Status(ctx)
}

func (f *Fallback) GenerateCards(ctx context.Context, content string, n int) (GenerateCardsResult, error) {
	r, err := f.primary.GenerateCards(ctx, content, n)
	if err != nil || len(r.Cards) == 0 {
		return f.stub.GenerateCards(ctx, content, n)
	}
	return r, nil
}

func (f *Fallback) EvaluateAnswer(ctx context.Context, in EvaluateAnswerInput) (EvaluateAnswerResult, error) {
	r, err := f.primary.EvaluateAnswer(ctx, in)
	if err != nil {
		return f.stub.EvaluateAnswer(ctx, in)
	}
	return r, nil
}

func (f *Fallback) ExplainCard(ctx context.Context, in ExplainCardInput) (ExplainCardResult, error) {
	r, err := f.primary.ExplainCard(ctx, in)
	if err != nil {
		return f.stub.ExplainCard(ctx, in)
	}
	return r, nil
}

func (f *Fallback) GenerateFollowUp(ctx context.Context, in GenerateFollowUpInput) (GenerateFollowUpResult, error) {
	r, err := f.primary.GenerateFollowUp(ctx, in)
	if err != nil {
		return f.stub.GenerateFollowUp(ctx, in)
	}
	return r, nil
}
