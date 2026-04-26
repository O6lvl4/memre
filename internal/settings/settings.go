// Package settings is a tiny KV vertical slice for app preferences.
// Values are stored as plain strings — callers handle parsing.
package settings

// Well-known keys. Centralised here so feature packages don't fight
// over string spellings.
const (
	KeyAIDefaultProvider = "ai.default_provider" // ollama | anthropic | claudecode
	KeyAIDefaultModel    = "ai.default_model"    // gemma4:26b | claude-sonnet-4-6 | …
	KeyAIAnthropicAPIKey = "ai.anthropic_api_key"
)
