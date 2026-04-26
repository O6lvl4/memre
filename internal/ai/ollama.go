package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// warmupState is split out so the Ollama struct itself stays
// safely value-copyable in WithBaseURL / WithModel — the mutex lives
// behind a pointer, not in the cloned struct.
type warmupState struct {
	mu   sync.Mutex
	done bool
}

// Ollama implements Provider against a locally running Ollama daemon.
// MEMRE_OLLAMA_URL / MEMRE_OLLAMA_MODEL override the defaults.
type Ollama struct {
	baseURL string
	model   string
	hc      *http.Client
	warmup  *warmupState
}

func NewOllama() *Ollama {
	return &Ollama{
		baseURL: envOr("MEMRE_OLLAMA_URL", "http://127.0.0.1:11434"),
		model:   envOr("MEMRE_OLLAMA_MODEL", "gemma4:26b"),
		hc:      &http.Client{Timeout: 240 * time.Second},
		warmup:  &warmupState{},
	}
}

// WithBaseURL / WithModel return a copy targeting a different daemon
// or model. Used by httptest in tests; production code wires once at
// composition time. The clone gets a fresh warmupState so it does its
// own one-shot warmup and doesn't share lock state with the original.
func (o *Ollama) WithBaseURL(url string) *Ollama {
	if url == "" {
		return o
	}
	clone := *o
	clone.baseURL = url
	clone.warmup = &warmupState{}
	return &clone
}

func (o *Ollama) WithModel(model string) *Ollama {
	if model == "" || model == o.model {
		return o
	}
	clone := *o
	clone.model = model
	clone.warmup = &warmupState{}
	return &clone
}

func envOr(k, def string) string {
	if v := strings.TrimSpace(os.Getenv(k)); v != "" {
		return v
	}
	return def
}

func (o *Ollama) Status(ctx context.Context) Status {
	s := Status{BaseURL: o.baseURL, Model: o.model}
	short, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(short, "GET", o.baseURL+"/api/tags", nil)
	resp, err := o.hc.Do(req)
	if err != nil {
		s.Error = err.Error()
		return s
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		s.Error = fmt.Sprintf("ollama %s: status %d", o.baseURL, resp.StatusCode)
		return s
	}
	var body struct {
		Models []struct {
			Name string `json:"name"`
		} `json:"models"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		s.Error = err.Error()
		return s
	}
	s.Connected = true
	for _, m := range body.Models {
		s.AvailableTags = append(s.AvailableTags, m.Name)
		if m.Name == o.model || strings.HasPrefix(m.Name, o.model+":") {
			s.ModelInstalled = true
		}
	}
	if s.Connected && s.ModelInstalled {
		o.warmupOnce()
	}
	return s
}

func (o *Ollama) warmupOnce() {
	if o.warmup == nil {
		o.warmup = &warmupState{}
	}
	o.warmup.mu.Lock()
	if o.warmup.done {
		o.warmup.mu.Unlock()
		return
	}
	o.warmup.done = true
	o.warmup.mu.Unlock()
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
		defer cancel()
		body, _ := json.Marshal(map[string]any{
			"model":      o.model,
			"prompt":     "",
			"stream":     false,
			"keep_alive": "30m",
		})
		req, _ := http.NewRequestWithContext(ctx, "POST", o.baseURL+"/api/generate", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		_, _ = o.hc.Do(req)
	}()
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model     string          `json:"model"`
	Messages  []chatMessage   `json:"messages"`
	Stream    bool            `json:"stream"`
	Format    json.RawMessage `json:"format,omitempty"`
	Options   map[string]any  `json:"options,omitempty"`
	KeepAlive string          `json:"keep_alive,omitempty"`
}

type chatResponse struct {
	Message chatMessage `json:"message"`
	Error   string      `json:"error,omitempty"`
}

func (o *Ollama) chat(ctx context.Context, system, user string, schema json.RawMessage) (string, error) {
	msgs := make([]chatMessage, 0, 2)
	if system != "" {
		msgs = append(msgs, chatMessage{Role: "system", Content: system})
	}
	msgs = append(msgs, chatMessage{Role: "user", Content: user})

	req := chatRequest{
		Model:     o.model,
		Messages:  msgs,
		Stream:    false,
		Format:    schema,
		KeepAlive: "30m",
		Options: map[string]any{
			"temperature": 0.3,
			"num_ctx":     4096,
			"num_predict": 768,
			"top_p":       0.9,
		},
	}
	body, err := json.Marshal(req)
	if err != nil {
		return "", err
	}
	httpReq, err := http.NewRequestWithContext(ctx, "POST", o.baseURL+"/api/chat", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	resp, err := o.hc.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("ollama chat: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		raw, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("ollama chat status %d: %s", resp.StatusCode, string(raw))
	}
	var out chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", err
	}
	if out.Error != "" {
		return "", errors.New(out.Error)
	}
	return out.Message.Content, nil
}

func (o *Ollama) GenerateCards(ctx context.Context, content string, n int) (GenerateCardsResult, error) {
	user := fmt.Sprintf(`次の素材から %d 枚のフラッシュカードを作ってください。
=== 素材 ===
%s
=== 要件 ===
- カード数は厳密に %d 枚。
- 重複した知識は避ける。
- スキーマに従ってJSONのみを出力する。`, n, content, n)
	out, err := o.chat(ctx, sysGenerateCards, user, generateCardsSchema)
	if err != nil {
		return GenerateCardsResult{}, err
	}
	var raw struct {
		Cards []GeneratedCard `json:"cards"`
	}
	if err := json.Unmarshal([]byte(out), &raw); err != nil {
		return GenerateCardsResult{}, err
	}
	if len(raw.Cards) > n {
		raw.Cards = raw.Cards[:n]
	}
	return GenerateCardsResult{Cards: raw.Cards}, nil
}

func (o *Ollama) EvaluateAnswer(ctx context.Context, in EvaluateAnswerInput) (EvaluateAnswerResult, error) {
	user := fmt.Sprintf(`元の質問: %s
模範解答: %s
追加で出した質問: %s
ユーザーの回答: %s

採点してください。`, in.OriginalQuestion, in.OriginalAnswer, in.FollowUpQuestion, in.UserAnswer)
	out, err := o.chat(ctx, sysEvaluateAnswer, user, evaluateSchema)
	if err != nil {
		return EvaluateAnswerResult{}, err
	}
	var r EvaluateAnswerResult
	if err := json.Unmarshal([]byte(out), &r); err != nil {
		return EvaluateAnswerResult{}, err
	}
	return r, nil
}

func (o *Ollama) ExplainCard(ctx context.Context, in ExplainCardInput) (ExplainCardResult, error) {
	user := fmt.Sprintf(`カードの質問: %s
カードの答え: %s
ユーザーの追加質問: %s
%s
上の追加質問に答えてください。`, in.CardQuestion, in.CardAnswer, in.UserQuestion, knowledgeBlock(in.KnowledgeContext))
	out, err := o.chat(ctx, sysExplain, user, explainSchema)
	if err != nil {
		return ExplainCardResult{}, err
	}
	var r ExplainCardResult
	if err := json.Unmarshal([]byte(out), &r); err != nil {
		return ExplainCardResult{}, err
	}
	return r, nil
}

func (o *Ollama) GenerateFollowUp(ctx context.Context, in GenerateFollowUpInput) (GenerateFollowUpResult, error) {
	user := fmt.Sprintf(`元の質問: %s
答え: %s
%s`, in.Question, in.Answer, knowledgeBlock(in.KnowledgeContext))
	out, err := o.chat(ctx, sysFollowUp, user, followUpSchema)
	if err != nil {
		return GenerateFollowUpResult{}, err
	}
	var r GenerateFollowUpResult
	if err := json.Unmarshal([]byte(out), &r); err != nil {
		return GenerateFollowUpResult{}, err
	}
	return r, nil
}

func knowledgeBlock(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	return "参考素材:\n" + s + "\n"
}
