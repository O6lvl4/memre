package ai

import (
	"context"
	"fmt"
	"strings"
	"unicode"
)

// Stub is a deterministic offline Provider used as fallback when the
// real LLM backend is unreachable. Output is intentionally crude so
// users notice they should set up Ollama.
type Stub struct{}

func NewStub() *Stub { return &Stub{} }

func (Stub) Status(ctx context.Context) Status {
	return Status{
		Connected:      false,
		BaseURL:        "stub://local",
		Model:          "stub",
		ModelInstalled: true,
	}
}

func (Stub) GenerateCards(ctx context.Context, content string, n int) (GenerateCardsResult, error) {
	if n <= 0 {
		n = 5
	}
	cards := make([]GeneratedCard, 0, n)
	for _, s := range splitSentences(content) {
		s = strings.TrimSpace(s)
		if len(s) < 8 {
			continue
		}
		q, a := splitForQA(s)
		if q == "" || a == "" {
			continue
		}
		cards = append(cards, GeneratedCard{Question: q, Answer: a})
		if len(cards) >= n {
			break
		}
	}
	return GenerateCardsResult{Cards: cards}, nil
}

func (Stub) EvaluateAnswer(ctx context.Context, in EvaluateAnswerInput) (EvaluateAnswerResult, error) {
	mu := strings.TrimSpace(in.UserAnswer)
	if mu == "" {
		return EvaluateAnswerResult{Score: "incorrect", Feedback: "回答が入力されていません。", Suggestion: "答えを思い出して入力してみましょう。"}, nil
	}
	if strings.Contains(mu, in.OriginalAnswer) || strings.Contains(in.OriginalAnswer, mu) {
		return EvaluateAnswerResult{Score: "good", Feedback: "主旨は合っています。"}, nil
	}
	return EvaluateAnswerResult{Score: "partial", Feedback: "惜しいですが要点が不足しています。", Suggestion: "模範解答を確認して、用語を抑えましょう。"}, nil
}

func (Stub) ExplainCard(ctx context.Context, in ExplainCardInput) (ExplainCardResult, error) {
	return ExplainCardResult{
		Explanation: fmt.Sprintf("「%s」の答えは「%s」です。\n(ローカルAI接続なし — 詳細解説はOllamaをセットアップすると有効になります)", in.CardQuestion, in.CardAnswer),
	}, nil
}

func (Stub) GenerateFollowUp(ctx context.Context, in GenerateFollowUpInput) (GenerateFollowUpResult, error) {
	return GenerateFollowUpResult{
		FollowUpQuestion: in.Question + " を別の言い方で説明してください。",
	}, nil
}

func splitSentences(s string) []string {
	var out []string
	var b strings.Builder
	for _, r := range s {
		b.WriteRune(r)
		if r == '。' || r == '.' || r == '!' || r == '?' || r == '\n' {
			out = append(out, b.String())
			b.Reset()
		}
	}
	if b.Len() > 0 {
		out = append(out, b.String())
	}
	return out
}

func splitForQA(s string) (q, a string) {
	runes := []rune(s)
	if len(runes) < 8 {
		return "", ""
	}
	mid := len(runes) / 2
	for i := mid; i < len(runes)-1; i++ {
		if unicode.IsSpace(runes[i]) || runes[i] == '、' || runes[i] == ',' {
			mid = i
			break
		}
	}
	left := strings.TrimSpace(string(runes[:mid]))
	right := strings.TrimSpace(string(runes[mid:]))
	if left == "" || right == "" {
		return "", ""
	}
	return left + " とは?", right
}
