// Package ai is the vertical slice for the AI context.
//
// All AI types — wire DTOs, the Provider port, the concrete Ollama and
// stub providers, the fallback wrapper, the Service, and the Wails
// handler — live in this single package. Provider is the consumer-side
// interface used by Service.
package ai

import "context"

type Status struct {
	Connected      bool     `json:"connected"`
	BaseURL        string   `json:"baseUrl"`
	Model          string   `json:"model"`
	ModelInstalled bool     `json:"modelInstalled"`
	AvailableTags  []string `json:"availableTags"`
	Error          string   `json:"error"`
}

type GeneratedCard struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

type GenerateCardsResult struct {
	Cards []GeneratedCard `json:"cards"`
}

type EvaluateAnswerInput struct {
	OriginalQuestion string `json:"originalQuestion"`
	OriginalAnswer   string `json:"originalAnswer"`
	FollowUpQuestion string `json:"followUpQuestion"`
	UserAnswer       string `json:"userAnswer"`
}

type EvaluateAnswerResult struct {
	Score      string `json:"score"` // good | partial | incorrect
	Feedback   string `json:"feedback"`
	Suggestion string `json:"suggestion"`
}

type ExplainCardInput struct {
	CardQuestion     string `json:"cardQuestion"`
	CardAnswer       string `json:"cardAnswer"`
	UserQuestion     string `json:"userQuestion"`
	KnowledgeContext string `json:"knowledgeContext"`
}

type ExplainCardResult struct {
	Explanation string `json:"explanation"`
}

type GenerateFollowUpInput struct {
	Question         string `json:"question"`
	Answer           string `json:"answer"`
	KnowledgeContext string `json:"knowledgeContext"`
}

type GenerateFollowUpResult struct {
	FollowUpQuestion string `json:"followUpQuestion"`
}

// Provider is the consumer-side interface used by Service. Concrete
// implementations (Ollama, stub, Fallback wrapper) live in this same
// package — that's the point of vertical slicing.
type Provider interface {
	Status(ctx context.Context) Status
	GenerateCards(ctx context.Context, content string, n int) (GenerateCardsResult, error)
	EvaluateAnswer(ctx context.Context, in EvaluateAnswerInput) (EvaluateAnswerResult, error)
	ExplainCard(ctx context.Context, in ExplainCardInput) (ExplainCardResult, error)
	GenerateFollowUp(ctx context.Context, in GenerateFollowUpInput) (GenerateFollowUpResult, error)
}
