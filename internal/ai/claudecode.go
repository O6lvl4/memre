package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os/exec"
	"strings"
)

// ClaudeCode implements Provider by shelling out to the `claude` CLI
// installed on the user's machine. It uses the user's existing Claude
// Code subscription credentials, so no API key is required.
//
// We invoke `claude -p "<prompt>" --output-format json --model <model>`
// in non-interactive mode and parse the resulting JSON for the actual
// assistant reply.
type ClaudeCode struct {
	binary string
	model  string
}

const ClaudeCodeDefaultModel = "claude-sonnet-4-6"

// ClaudeCodeModels surfaces the same set the Anthropic provider offers,
// since Claude Code wraps the same backend models.
var ClaudeCodeModels = AnthropicModels

func NewClaudeCode(model string) *ClaudeCode {
	if model == "" {
		model = ClaudeCodeDefaultModel
	}
	return &ClaudeCode{binary: "claude", model: model}
}

func (c *ClaudeCode) WithModel(model string) *ClaudeCode {
	if model == "" {
		return c
	}
	clone := *c
	clone.model = model
	return &clone
}

func (c *ClaudeCode) Status(ctx context.Context) Status {
	s := Status{BaseURL: "claude://cli", Model: c.model, AvailableTags: ClaudeCodeModels}
	path, err := exec.LookPath(c.binary)
	if err != nil {
		s.Error = "claude CLI not found in PATH (install Claude Code first)"
		return s
	}
	s.BaseURL = path
	s.Connected = true
	s.ModelInstalled = true
	return s
}

// claudeCLIResponse is the shape returned by `claude -p ... --output-format json`.
// The binary returns one JSON object summarising the run; result.text
// holds the assistant's final message.
type claudeCLIResponse struct {
	Result    string `json:"result"`
	IsError   bool   `json:"is_error"`
	NumTurns  int    `json:"num_turns"`
	SessionID string `json:"session_id"`
}

func (c *ClaudeCode) run(ctx context.Context, system, user string, schemaHint string) (string, error) {
	if _, err := exec.LookPath(c.binary); err != nil {
		return "", errors.New("claude CLI not installed")
	}
	prompt := buildClaudeCodePrompt(system, user, schemaHint)

	cmd := exec.CommandContext(ctx, c.binary,
		"-p", prompt,
		"--model", c.model,
		"--output-format", "json",
	)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("claude cli failed: %w (stderr=%s)", err, stderr.String())
	}
	var resp claudeCLIResponse
	if err := json.Unmarshal(stdout.Bytes(), &resp); err != nil {
		// Older versions emit plain text — fall back to raw output.
		return strings.TrimSpace(stripCodeFence(stdout.String())), nil
	}
	if resp.IsError {
		return "", fmt.Errorf("claude cli error: %s", resp.Result)
	}
	return strings.TrimSpace(stripCodeFence(resp.Result)), nil
}

// buildClaudeCodePrompt fuses the system instruction, user content, and
// JSON schema hint into a single prompt because Claude Code's `-p`
// non-interactive mode collapses the conversation into a single turn.
func buildClaudeCodePrompt(system, user, schemaHint string) string {
	var sb strings.Builder
	sb.WriteString(system)
	sb.WriteString("\n\n")
	if schemaHint != "" {
		sb.WriteString("出力フォーマット(以下のJSON Schemaに従う、JSONオブジェクトのみ・前置き禁止):\n")
		sb.WriteString(schemaHint)
		sb.WriteString("\n\n")
	}
	sb.WriteString("--- ユーザー入力 ---\n")
	sb.WriteString(user)
	return sb.String()
}

func (c *ClaudeCode) GenerateCards(ctx context.Context, content string, n int) (GenerateCardsResult, error) {
	user := fmt.Sprintf(`次の素材から %d 枚のフラッシュカードを作ってください。
=== 素材 ===
%s
=== 要件 ===
- カード数は厳密に %d 枚。
- 重複した知識は避ける。`, n, content, n)
	out, err := c.run(ctx, sysGenerateCards, user, string(generateCardsSchema))
	if err != nil {
		return GenerateCardsResult{}, err
	}
	var raw struct {
		Cards []GeneratedCard `json:"cards"`
	}
	if err := json.Unmarshal([]byte(out), &raw); err != nil {
		return GenerateCardsResult{}, fmt.Errorf("claudecode parse: %w (raw=%s)", err, out)
	}
	if len(raw.Cards) > n {
		raw.Cards = raw.Cards[:n]
	}
	return GenerateCardsResult{Cards: raw.Cards}, nil
}

func (c *ClaudeCode) EvaluateAnswer(ctx context.Context, in EvaluateAnswerInput) (EvaluateAnswerResult, error) {
	user := fmt.Sprintf(`元の質問: %s
模範解答: %s
追加で出した質問: %s
ユーザーの回答: %s

採点してください。`, in.OriginalQuestion, in.OriginalAnswer, in.FollowUpQuestion, in.UserAnswer)
	out, err := c.run(ctx, sysEvaluateAnswer, user, string(evaluateSchema))
	if err != nil {
		return EvaluateAnswerResult{}, err
	}
	var r EvaluateAnswerResult
	if err := json.Unmarshal([]byte(out), &r); err != nil {
		return EvaluateAnswerResult{}, err
	}
	return r, nil
}

func (c *ClaudeCode) ExplainCard(ctx context.Context, in ExplainCardInput) (ExplainCardResult, error) {
	user := fmt.Sprintf(`カードの質問: %s
カードの答え: %s
ユーザーの追加質問: %s
%s
上の追加質問に答えてください。`, in.CardQuestion, in.CardAnswer, in.UserQuestion, knowledgeBlock(in.KnowledgeContext))
	out, err := c.run(ctx, sysExplain, user, string(explainSchema))
	if err != nil {
		return ExplainCardResult{}, err
	}
	var r ExplainCardResult
	if err := json.Unmarshal([]byte(out), &r); err != nil {
		return ExplainCardResult{}, err
	}
	return r, nil
}

func (c *ClaudeCode) GenerateFollowUp(ctx context.Context, in GenerateFollowUpInput) (GenerateFollowUpResult, error) {
	user := fmt.Sprintf(`元の質問: %s
答え: %s
%s`, in.Question, in.Answer, knowledgeBlock(in.KnowledgeContext))
	out, err := c.run(ctx, sysFollowUp, user, string(followUpSchema))
	if err != nil {
		return GenerateFollowUpResult{}, err
	}
	var r GenerateFollowUpResult
	if err := json.Unmarshal([]byte(out), &r); err != nil {
		return GenerateFollowUpResult{}, err
	}
	return r, nil
}
