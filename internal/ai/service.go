package ai

import "context"

// Service routes AI calls through the Registry, honouring per-call
// Override hints so the UI can do "use Sonnet for this single
// generation" without changing the global default.
type Service struct {
	registry *Registry
}

func NewService(r *Registry) *Service { return &Service{registry: r} }

// CurrentDefault returns the Status of whichever provider is currently
// the default. The header indicator uses this so the badge matches what
// will actually run.
func (s *Service) CurrentDefault(ctx context.Context) Status {
	p, model := s.registry.Default()
	if p == nil {
		return Status{Error: "no providers"}
	}
	st := p.Status(ctx)
	if st.Model == "" || st.Model != model {
		st.Model = model
	}
	return st
}

func (s *Service) ListProviders(ctx context.Context) []ProviderInfo {
	return s.registry.List(ctx)
}

func (s *Service) GenerateCards(ctx context.Context, content string, n int, ovr Override) (GenerateCardsResult, error) {
	if n <= 0 {
		n = 5
	}
	p, _, err := s.registry.Resolve(ovr)
	if err != nil {
		return GenerateCardsResult{}, err
	}
	return p.GenerateCards(ctx, content, n)
}

func (s *Service) EvaluateAnswer(ctx context.Context, in EvaluateAnswerInput, ovr Override) (EvaluateAnswerResult, error) {
	p, _, err := s.registry.Resolve(ovr)
	if err != nil {
		return EvaluateAnswerResult{}, err
	}
	return p.EvaluateAnswer(ctx, in)
}

func (s *Service) ExplainCard(ctx context.Context, in ExplainCardInput, ovr Override) (ExplainCardResult, error) {
	p, _, err := s.registry.Resolve(ovr)
	if err != nil {
		return ExplainCardResult{}, err
	}
	return p.ExplainCard(ctx, in)
}

func (s *Service) GenerateFollowUp(ctx context.Context, in GenerateFollowUpInput, ovr Override) (GenerateFollowUpResult, error) {
	p, _, err := s.registry.Resolve(ovr)
	if err != nil {
		return GenerateFollowUpResult{}, err
	}
	return p.GenerateFollowUp(ctx, in)
}
