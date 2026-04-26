package settings

import "context"

type WailsHandler struct {
	svc *Service
}

func NewWailsHandler(svc *Service) *WailsHandler { return &WailsHandler{svc: svc} }

// Snapshot is the JS-friendly read-all DTO. We never expose the raw key
// names to the UI — only the well-known ones, sanitised. The API key is
// returned in the clear because the frontend already lives in the same
// process and needs it to render "configured" state in the settings UI.
type Snapshot struct {
	DefaultProvider string `json:"defaultProvider"`
	DefaultModel    string `json:"defaultModel"`
	AnthropicAPIKey string `json:"anthropicApiKey"`
}

func (h *WailsHandler) Get() (Snapshot, error) {
	ctx := context.Background()
	return Snapshot{
		DefaultProvider: h.svc.GetOr(ctx, KeyAIDefaultProvider, ""),
		DefaultModel:    h.svc.GetOr(ctx, KeyAIDefaultModel, ""),
		AnthropicAPIKey: h.svc.GetOr(ctx, KeyAIAnthropicAPIKey, ""),
	}, nil
}

type SetInput struct {
	DefaultProvider string `json:"defaultProvider"`
	DefaultModel    string `json:"defaultModel"`
	AnthropicAPIKey string `json:"anthropicApiKey"`
}

func (h *WailsHandler) Set(in SetInput) error {
	ctx := context.Background()
	if err := h.svc.Set(ctx, KeyAIDefaultProvider, in.DefaultProvider); err != nil {
		return err
	}
	if err := h.svc.Set(ctx, KeyAIDefaultModel, in.DefaultModel); err != nil {
		return err
	}
	if err := h.svc.Set(ctx, KeyAIAnthropicAPIKey, in.AnthropicAPIKey); err != nil {
		return err
	}
	return nil
}
