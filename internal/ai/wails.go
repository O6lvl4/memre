package ai

import "context"

type WailsHandler struct {
	svc *Service
}

func NewWailsHandler(svc *Service) *WailsHandler { return &WailsHandler{svc: svc} }

// Status reports the active default provider's Status. Cheap (~2s) —
// driven by the header indicator at app boot and every 30s thereafter.
func (h *WailsHandler) Status() Status {
	return h.svc.CurrentDefault(context.Background())
}

func (h *WailsHandler) ListProviders() []ProviderInfo {
	return h.svc.ListProviders(context.Background())
}

func (h *WailsHandler) GenerateCards(content string, n int, providerOverride, modelOverride string) (GenerateCardsResult, error) {
	return h.svc.GenerateCards(
		context.Background(), content, n,
		Override{Provider: ProviderID(providerOverride), Model: modelOverride},
	)
}

func (h *WailsHandler) EvaluateAnswer(originalQuestion, originalAnswer, followUpQuestion, userAnswer, providerOverride, modelOverride string) (EvaluateAnswerResult, error) {
	return h.svc.EvaluateAnswer(
		context.Background(),
		EvaluateAnswerInput{
			OriginalQuestion: originalQuestion,
			OriginalAnswer:   originalAnswer,
			FollowUpQuestion: followUpQuestion,
			UserAnswer:       userAnswer,
		},
		Override{Provider: ProviderID(providerOverride), Model: modelOverride},
	)
}

func (h *WailsHandler) ExplainCard(cardQuestion, cardAnswer, userQuestion, knowledgeContext, providerOverride, modelOverride string) (ExplainCardResult, error) {
	return h.svc.ExplainCard(
		context.Background(),
		ExplainCardInput{
			CardQuestion:     cardQuestion,
			CardAnswer:       cardAnswer,
			UserQuestion:     userQuestion,
			KnowledgeContext: knowledgeContext,
		},
		Override{Provider: ProviderID(providerOverride), Model: modelOverride},
	)
}

func (h *WailsHandler) GenerateFollowUp(question, answer, knowledgeContext, providerOverride, modelOverride string) (GenerateFollowUpResult, error) {
	return h.svc.GenerateFollowUp(
		context.Background(),
		GenerateFollowUpInput{
			Question:         question,
			Answer:           answer,
			KnowledgeContext: knowledgeContext,
		},
		Override{Provider: ProviderID(providerOverride), Model: modelOverride},
	)
}
