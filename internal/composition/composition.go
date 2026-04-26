// Package composition is the composition root of the application.
//
// It is the only place that wires concrete adapters into feature
// services. Everything below imports only its sibling vertical slices,
// which is what keeps each context independently testable.
package composition

import (
	"context"
	"embed"

	"github.com/O6lvl4/memre/internal/ai"
	"github.com/O6lvl4/memre/internal/card"
	"github.com/O6lvl4/memre/internal/deck"
	"github.com/O6lvl4/memre/internal/knowledge"
	"github.com/O6lvl4/memre/internal/platform/clock"
	"github.com/O6lvl4/memre/internal/platform/idgen"
	"github.com/O6lvl4/memre/internal/platform/sqlite"
	"github.com/O6lvl4/memre/internal/settings"

	wailsapp "github.com/wailsapp/wails/v3/pkg/application"
)

// Run constructs the dependency graph and starts the Wails app.
// `assets` is the embed.FS holding the production frontend bundle —
// it must be supplied by the caller because go:embed paths are relative
// to the source file containing the directive.
func Run(assets embed.FS) error {
	// --- Platform --------------------------------------------------------
	store, err := sqlite.Open()
	if err != nil {
		return err
	}
	defer store.Close()

	clk := clock.System{}
	ids := idgen.Crypto{}

	// --- Settings (read first so the AI registry can pick up overrides) --
	settingsRepo := settings.NewSqliteRepository(store)
	settingsSvc := settings.NewService(settingsRepo)
	settingsH := settings.NewWailsHandler(settingsSvc)

	// Suppliers read from settings every time. ai.Registry calls these
	// before each Resolve, so changes from the settings dialog take
	// effect immediately — no app restart required.
	anthropicKey := func() string {
		return settingsSvc.GetOr(context.Background(), settings.KeyAIAnthropicAPIKey, "")
	}

	// --- Feature slices --------------------------------------------------
	deckRepo := deck.NewSqliteRepository(store)
	cardRepo := card.NewSqliteRepository(store)
	ksRepo := knowledge.NewSqliteRepository(store)

	deckSvc := deck.NewService(deckRepo, cardRepo, clk, ids)
	cardSvc := card.NewService(cardRepo, clk, ids)
	ksSvc := knowledge.NewService(ksRepo, clk, ids)

	// --- AI registry: wire all providers, default from settings ---------
	registry := ai.NewRegistry()

	ollama := ai.NewOllama()
	registry.Register(ai.ProviderOllama, ai.NewFallback(ollama), ai.ProviderInfo{
		Name:            "Ollama (local)",
		DefaultModel:    "gemma4:26b",
		SupportedModels: []string{"gemma4:26b", "gemma4:e4b", "qwen2.5:14b-instruct"},
		Note:            "ローカルで動作。Ollamaが起動していれば自動接続。",
	})

	registry.Register(ai.ProviderAnthropic, ai.NewAnthropicWithKeyFunc(anthropicKey, ""), ai.ProviderInfo{
		Name:            "Anthropic API",
		DefaultModel:    ai.AnthropicDefaultModel,
		SupportedModels: ai.AnthropicModels,
		Note:            "ANTHROPIC_API_KEYまたは設定画面のキーを使用。",
	})

	registry.Register(ai.ProviderClaudeCode, ai.NewClaudeCode(""), ai.ProviderInfo{
		Name:            "Claude Code (CLI)",
		DefaultModel:    ai.ClaudeCodeDefaultModel,
		SupportedModels: ai.ClaudeCodeModels,
		Note:            "ローカルの `claude` CLI 経由。Claude Code利用権で動作。",
	})

	registry.Register(ai.ProviderStub, ai.NewStub(), ai.ProviderInfo{
		Name:            "Local stub",
		DefaultModel:    "stub",
		SupportedModels: []string{"stub"},
		Note:            "オフラインフォールバック(品質低)。",
	})

	// Static fallback (used when settings haven't been written yet).
	registry.SetDefault(ai.ProviderOllama, "")
	// Dynamic selector reads from settings on every call.
	registry.SetSelector(&settingsSelector{svc: settingsSvc})

	aiSvc := ai.NewService(registry)

	// --- Wails handlers (one per slice) ----------------------------------
	deckH := deck.NewWailsHandler(deckSvc)
	cardH := card.NewWailsHandler(cardSvc)
	ksH := knowledge.NewWailsHandler(ksSvc)
	aiH := ai.NewWailsHandler(aiSvc)

	app := wailsapp.New(wailsapp.Options{
		Name:        "MemRE",
		Description: "AI-powered spaced repetition flashcards",
		Services: []wailsapp.Service{
			wailsapp.NewService(deckH),
			wailsapp.NewService(cardH),
			wailsapp.NewService(ksH),
			wailsapp.NewService(aiH),
			wailsapp.NewService(settingsH),
		},
		Assets: wailsapp.AssetOptions{
			Handler: wailsapp.AssetFileServerFS(assets),
		},
		Mac: wailsapp.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.Window.NewWithOptions(wailsapp.WebviewWindowOptions{
		Title:  "MemRE",
		Width:  1180,
		Height: 800,
		Mac: wailsapp.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                wailsapp.MacBackdropNormal,
			TitleBar:                wailsapp.MacTitleBarHiddenInset,
		},
		BackgroundColour: wailsapp.NewRGB(249, 250, 251),
		URL:              "/",
	})

	return app.Run()
}

// settingsSelector adapts *settings.Service to ai.DefaultSelector so
// the AI registry resolves its default at call time. Cheap (single
// SQLite SELECT per AI call).
type settingsSelector struct {
	svc *settings.Service
}

func (s *settingsSelector) Default() (ai.ProviderID, string) {
	ctx := context.Background()
	provider := s.svc.GetOr(ctx, settings.KeyAIDefaultProvider, "")
	model := s.svc.GetOr(ctx, settings.KeyAIDefaultModel, "")
	return ai.ProviderID(provider), model
}
