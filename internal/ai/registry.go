package ai

import (
	"context"
	"errors"
)

// ProviderID is a stable string identifier per provider so settings and
// per-call overrides can roundtrip through the UI.
type ProviderID string

const (
	ProviderOllama     ProviderID = "ollama"
	ProviderAnthropic  ProviderID = "anthropic"
	ProviderClaudeCode ProviderID = "claudecode"
	ProviderStub       ProviderID = "stub"
)

// ProviderInfo describes a registered provider for the UI.
type ProviderInfo struct {
	ID            ProviderID `json:"id"`
	Name          string     `json:"name"`
	Available     bool       `json:"available"`
	Configured    bool       `json:"configured"`
	DefaultModel  string     `json:"defaultModel"`
	SupportedModels []string `json:"supportedModels"`
	Note          string     `json:"note"`
}

// Override is the optional per-call substitution. Both fields are
// optional; an empty Provider keeps the registry default.
type Override struct {
	Provider ProviderID `json:"provider"`
	Model    string     `json:"model"`
}

// DefaultSelector returns the currently-preferred (provider, model)
// pair. Composition wires a selector backed by Settings so saving the
// settings dialog takes effect immediately, no restart required.
type DefaultSelector interface {
	Default() (ProviderID, string)
}

// Registry holds all configured providers and the current default.
// The default may be a static (id, model) pair set at composition time,
// or — when a DefaultSelector is registered — a function that's
// re-consulted on every AI call so settings hot-reload.
type Registry struct {
	providers       map[ProviderID]Provider
	infos           map[ProviderID]ProviderInfo
	defaultProvider ProviderID
	defaultModel    string
	selector        DefaultSelector
}

func NewRegistry() *Registry {
	return &Registry{
		providers: map[ProviderID]Provider{},
		infos:     map[ProviderID]ProviderInfo{},
	}
}

func (r *Registry) Register(id ProviderID, p Provider, info ProviderInfo) {
	info.ID = id
	r.providers[id] = p
	r.infos[id] = info
}

func (r *Registry) SetDefault(id ProviderID, model string) {
	r.defaultProvider = id
	r.defaultModel = model
}

// SetSelector installs a hot-reload-capable DefaultSelector. When set,
// it overrides the static defaults for every Resolve call.
func (r *Registry) SetSelector(s DefaultSelector) {
	r.selector = s
}

// Default returns the provider currently selected as default plus the
// model name that should be used when a caller doesn't override.
func (r *Registry) Default() (Provider, string) {
	id, model := r.defaultProvider, r.defaultModel
	if r.selector != nil {
		if sid, sm := r.selector.Default(); sid != "" {
			id = sid
			if sm != "" {
				model = sm
			}
		}
	}
	if p, ok := r.providers[id]; ok {
		// Apply the dynamic model override on cloud providers that
		// support cheap re-binding (Anthropic / ClaudeCode).
		return withModel(p, model), model
	}
	// Fall back to the first registered provider in a deterministic
	// order if the configured default is missing.
	for _, id := range []ProviderID{ProviderOllama, ProviderAnthropic, ProviderClaudeCode, ProviderStub} {
		if p, ok := r.providers[id]; ok {
			return p, r.infos[id].DefaultModel
		}
	}
	return nil, ""
}

// Resolve picks the provider + model to use for a single call. If the
// override names a known provider, it wins; otherwise the registry
// default is used. The returned Provider is always non-nil unless the
// registry is empty.
func (r *Registry) Resolve(ovr Override) (Provider, string, error) {
	if ovr.Provider != "" {
		p, ok := r.providers[ovr.Provider]
		if !ok {
			return nil, "", errors.New("unknown provider: " + string(ovr.Provider))
		}
		model := ovr.Model
		if model == "" {
			model = r.infos[ovr.Provider].DefaultModel
		}
		return withModel(p, model), model, nil
	}
	p, model := r.Default()
	if p == nil {
		return nil, "", errors.New("no AI providers registered")
	}
	if ovr.Model != "" {
		model = ovr.Model
	}
	return withModel(p, model), model, nil
}

// withModel rebinds a provider's model when the concrete type supports
// it. Each provider's WithModel returns a cheap clone — the registry
// never mutates the provider that lives in r.providers. Fallback is
// recursive so the inner primary gets the override too.
func withModel(p Provider, model string) Provider {
	if model == "" {
		return p
	}
	switch concrete := p.(type) {
	case *Anthropic:
		return concrete.WithModel(model)
	case *ClaudeCode:
		return concrete.WithModel(model)
	case *Ollama:
		return concrete.WithModel(model)
	case *Fallback:
		return &Fallback{primary: withModel(concrete.primary, model), stub: concrete.stub}
	}
	return p
}

// List returns the registered providers' info, with Available reflecting
// the current Status.Connected of each.
func (r *Registry) List(ctx context.Context) []ProviderInfo {
	order := []ProviderID{ProviderOllama, ProviderClaudeCode, ProviderAnthropic, ProviderStub}
	out := make([]ProviderInfo, 0, len(r.infos))
	for _, id := range order {
		info, ok := r.infos[id]
		if !ok {
			continue
		}
		s := r.providers[id].Status(ctx)
		info.Available = s.Connected
		info.Configured = s.Connected || s.ModelInstalled
		out = append(out, info)
	}
	return out
}
