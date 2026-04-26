package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Anthropic implements Provider against api.anthropic.com directly.
// The API key is fetched lazily on every call via keyFunc so the
// settings dialog takes effect without restarting the app.
type Anthropic struct {
	keyFunc func() string
	model   string
	baseURL string
	hc      *http.Client
}

const anthropicProductionBase = "https://api.anthropic.com"

// AnthropicModels lists the Claude tags MemRE will offer in the UI.
// Newest first; MemRE default is Sonnet.
var AnthropicModels = []string{
	"claude-opus-4-7",
	"claude-sonnet-4-6",
	"claude-haiku-4-5-20251001",
}

const AnthropicDefaultModel = "claude-sonnet-4-6"

// NewAnthropic constructs a provider with a static API key. Tests and
// simple uses prefer this constructor.
func NewAnthropic(apiKey, model string) *Anthropic {
	return NewAnthropicWithKeyFunc(func() string { return apiKey }, model)
}

// NewAnthropicWithKeyFunc takes a supplier so the API key can be read
// fresh from Settings before each call (settings hot-reload).
func NewAnthropicWithKeyFunc(keyFunc func() string, model string) *Anthropic {
	if model == "" {
		model = AnthropicDefaultModel
	}
	if keyFunc == nil {
		keyFunc = func() string { return "" }
	}
	return &Anthropic{
		keyFunc: keyFunc,
		model:   model,
		baseURL: anthropicProductionBase,
		hc:      &http.Client{Timeout: 240 * time.Second},
	}
}

// WithBaseURL is intended for httptest. The default is the production
// Anthropic endpoint.
func (a *Anthropic) WithBaseURL(base string) *Anthropic {
	if base == "" {
		return a
	}
	clone := *a
	clone.baseURL = base
	return &clone
}

func (a *Anthropic) WithModel(model string) *Anthropic {
	if model == "" || model == a.model {
		return a
	}
	clone := *a
	clone.model = model
	return &clone
}

func (a *Anthropic) Status(ctx context.Context) Status {
	s := Status{BaseURL: a.baseURL, Model: a.model}
	if strings.TrimSpace(a.keyFunc()) == "" {
		s.Error = "Anthropic API key is not set"
		return s
	}
	s.Connected = true
	s.ModelInstalled = true
	s.AvailableTags = AnthropicModels
	return s
}

type anthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type anthropicRequest struct {
	Model     string             `json:"model"`
	MaxTokens int                `json:"max_tokens"`
	System    string             `json:"system,omitempty"`
	Messages  []anthropicMessage `json:"messages"`
}

type anthropicContentBlock struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type anthropicResponse struct {
	Content []anthropicContentBlock `json:"content"`
	Error   *struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// chat sends a single non-streaming message. The schema is appended to
// the system prompt as a strong hint — Anthropic doesn't enforce JSON
// schemas the way Ollama 0.5+ does, but Sonnet/Opus follow inlined
// schemas extremely reliably.
func (a *Anthropic) chat(ctx context.Context, system, user string, schemaHint string) (string, error) {
	apiKey := a.keyFunc()
	if strings.TrimSpace(apiKey) == "" {
		return "", errors.New("anthropic api key is not configured")
	}
	if schemaHint != "" {
		system = system + "\n\n--- 出力フォーマット(必ず以下のJSON Schemaに従う) ---\n" + schemaHint + "\n出力はJSONオブジェクトのみ。前置き・コードフェンスなど一切付けない。"
	}
	body, _ := json.Marshal(anthropicRequest{
		Model:     a.model,
		MaxTokens: 1024,
		System:    system,
		Messages:  []anthropicMessage{{Role: "user", Content: user}},
	})
	req, err := http.NewRequestWithContext(ctx, "POST", a.baseURL+"/v1/messages", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := a.hc.Do(req)
	if err != nil {
		return "", fmt.Errorf("anthropic call: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		raw, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("anthropic status %d: %s", resp.StatusCode, string(raw))
	}
	var out anthropicResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", err
	}
	if out.Error != nil {
		return "", errors.New(out.Error.Message)
	}
	var sb strings.Builder
	for _, b := range out.Content {
		if b.Type == "text" {
			sb.WriteString(b.Text)
		}
	}
	return strings.TrimSpace(stripCodeFence(sb.String())), nil
}

// stripCodeFence is a tiny safety net: if the model wraps JSON in ```json
// fences (rare on Sonnet, more common on Haiku), we strip them.
func stripCodeFence(s string) string {
	s = strings.TrimSpace(s)
	if !strings.HasPrefix(s, "```") {
		return s
	}
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```")
	s = strings.TrimSuffix(s, "```")
	return strings.TrimSpace(s)
}

func (a *Anthropic) GenerateCards(ctx context.Context, content string, n int) (GenerateCardsResult, error) {
	user := fmt.Sprintf(`次の素材から %d 枚のフラッシュカードを作ってください。
=== 素材 ===
%s
=== 要件 ===
- カード数は厳密に %d 枚。
- 重複した知識は避ける。`, n, content, n)
	out, err := a.chat(ctx, sysGenerateCards, user, string(generateCardsSchema))
	if err != nil {
		return GenerateCardsResult{}, err
	}
	var raw struct {
		Cards []GeneratedCard `json:"cards"`
	}
	if err := json.Unmarshal([]byte(out), &raw); err != nil {
		return GenerateCardsResult{}, fmt.Errorf("anthropic JSON parse: %w (raw=%s)", err, out)
	}
	if len(raw.Cards) > n {
		raw.Cards = raw.Cards[:n]
	}
	return GenerateCardsResult{Cards: raw.Cards}, nil
}

func (a *Anthropic) EvaluateAnswer(ctx context.Context, in EvaluateAnswerInput) (EvaluateAnswerResult, error) {
	user := fmt.Sprintf(`元の質問: %s
模範解答: %s
追加で出した質問: %s
ユーザーの回答: %s

採点してください。`, in.OriginalQuestion, in.OriginalAnswer, in.FollowUpQuestion, in.UserAnswer)
	out, err := a.chat(ctx, sysEvaluateAnswer, user, string(evaluateSchema))
	if err != nil {
		return EvaluateAnswerResult{}, err
	}
	var r EvaluateAnswerResult
	if err := json.Unmarshal([]byte(out), &r); err != nil {
		return EvaluateAnswerResult{}, err
	}
	return r, nil
}

func (a *Anthropic) ExplainCard(ctx context.Context, in ExplainCardInput) (ExplainCardResult, error) {
	user := fmt.Sprintf(`カードの質問: %s
カードの答え: %s
ユーザーの追加質問: %s
%s
上の追加質問に答えてください。`, in.CardQuestion, in.CardAnswer, in.UserQuestion, knowledgeBlock(in.KnowledgeContext))
	out, err := a.chat(ctx, sysExplain, user, string(explainSchema))
	if err != nil {
		return ExplainCardResult{}, err
	}
	var r ExplainCardResult
	if err := json.Unmarshal([]byte(out), &r); err != nil {
		return ExplainCardResult{}, err
	}
	return r, nil
}

func (a *Anthropic) GenerateFollowUp(ctx context.Context, in GenerateFollowUpInput) (GenerateFollowUpResult, error) {
	user := fmt.Sprintf(`元の質問: %s
答え: %s
%s`, in.Question, in.Answer, knowledgeBlock(in.KnowledgeContext))
	out, err := a.chat(ctx, sysFollowUp, user, string(followUpSchema))
	if err != nil {
		return GenerateFollowUpResult{}, err
	}
	var r GenerateFollowUpResult
	if err := json.Unmarshal([]byte(out), &r); err != nil {
		return GenerateFollowUpResult{}, err
	}
	return r, nil
}
