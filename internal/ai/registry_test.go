package ai

import (
	"context"
	"errors"
	"testing"
)

// fakeProvider is a controllable Provider for registry/fallback tests.
type fakeProvider struct {
	name        string
	failGen     bool
	failEval    bool
	connected   bool
}

func (f *fakeProvider) Status(context.Context) Status {
	return Status{Connected: f.connected, Model: f.name}
}
func (f *fakeProvider) GenerateCards(_ context.Context, _ string, n int) (GenerateCardsResult, error) {
	if f.failGen {
		return GenerateCardsResult{}, errors.New("boom")
	}
	cards := make([]GeneratedCard, n)
	for i := range cards {
		cards[i] = GeneratedCard{Question: f.name + "Q", Answer: f.name + "A"}
	}
	return GenerateCardsResult{Cards: cards}, nil
}
func (f *fakeProvider) EvaluateAnswer(context.Context, EvaluateAnswerInput) (EvaluateAnswerResult, error) {
	if f.failEval {
		return EvaluateAnswerResult{}, errors.New("boom")
	}
	return EvaluateAnswerResult{Score: "good", Feedback: f.name}, nil
}
func (f *fakeProvider) ExplainCard(context.Context, ExplainCardInput) (ExplainCardResult, error) {
	return ExplainCardResult{Explanation: f.name}, nil
}
func (f *fakeProvider) GenerateFollowUp(context.Context, GenerateFollowUpInput) (GenerateFollowUpResult, error) {
	return GenerateFollowUpResult{FollowUpQuestion: f.name}, nil
}

func TestRegistryDefaultUsedWhenOverrideEmpty(t *testing.T) {
	r := NewRegistry()
	r.Register(ProviderOllama, &fakeProvider{name: "ollama"}, ProviderInfo{Name: "Ollama"})
	r.Register(ProviderAnthropic, &fakeProvider{name: "anthropic"}, ProviderInfo{Name: "Anthropic"})
	r.SetDefault(ProviderAnthropic, "claude-sonnet-4-6")

	p, model, err := r.Resolve(Override{})
	if err != nil {
		t.Fatal(err)
	}
	if model != "claude-sonnet-4-6" {
		t.Errorf("want default model, got %q", model)
	}
	if p.(*fakeProvider).name != "anthropic" {
		t.Errorf("default provider not used")
	}
}

func TestRegistryOverrideWins(t *testing.T) {
	r := NewRegistry()
	r.Register(ProviderOllama, &fakeProvider{name: "ollama"}, ProviderInfo{Name: "Ollama"})
	r.Register(ProviderAnthropic, &fakeProvider{name: "anthropic"}, ProviderInfo{Name: "Anthropic"})
	r.SetDefault(ProviderOllama, "gemma4:e4b")

	p, model, err := r.Resolve(Override{Provider: ProviderAnthropic, Model: "claude-haiku-4-5"})
	if err != nil {
		t.Fatal(err)
	}
	if model != "claude-haiku-4-5" {
		t.Errorf("want override model, got %q", model)
	}
	if p.(*fakeProvider).name != "anthropic" {
		t.Errorf("override provider not used")
	}
}

func TestRegistryUnknownOverrideErrors(t *testing.T) {
	r := NewRegistry()
	r.Register(ProviderOllama, &fakeProvider{name: "ollama"}, ProviderInfo{})
	r.SetDefault(ProviderOllama, "x")
	if _, _, err := r.Resolve(Override{Provider: "missing"}); err == nil {
		t.Error("unknown provider should error")
	}
}

func TestRegistryFallsBackWhenDefaultMissing(t *testing.T) {
	r := NewRegistry()
	r.Register(ProviderOllama, &fakeProvider{name: "ollama"}, ProviderInfo{DefaultModel: "gemma4:26b"})
	r.SetDefault(ProviderID("ghost"), "x") // not registered

	p, _ := r.Default()
	if p.(*fakeProvider).name != "ollama" {
		t.Errorf("expected fallback to first registered (ollama), got %v", p)
	}
}

func TestRegistryListReportsConnectivity(t *testing.T) {
	r := NewRegistry()
	r.Register(ProviderOllama, &fakeProvider{name: "ollama", connected: true}, ProviderInfo{Name: "Ollama"})
	r.Register(ProviderStub, &fakeProvider{name: "stub", connected: false}, ProviderInfo{Name: "Stub"})

	infos := r.List(context.Background())
	if len(infos) != 2 {
		t.Fatalf("want 2 infos, got %d", len(infos))
	}
	for _, info := range infos {
		switch info.ID {
		case ProviderOllama:
			if !info.Available {
				t.Errorf("ollama should be available")
			}
		case ProviderStub:
			if info.Available {
				t.Errorf("stub should NOT be available")
			}
		}
	}
}

func TestFallbackUsesPrimaryOnSuccess(t *testing.T) {
	primary := &fakeProvider{name: "primary"}
	f := NewFallback(primary)
	r, err := f.GenerateCards(context.Background(), "x", 2)
	if err != nil {
		t.Fatal(err)
	}
	if len(r.Cards) != 2 || r.Cards[0].Question != "primaryQ" {
		t.Errorf("want primary cards, got %+v", r)
	}
}

func TestFallbackUsesStubOnError(t *testing.T) {
	primary := &fakeProvider{name: "primary", failGen: true}
	f := NewFallback(primary)
	// Stub.GenerateCards needs at least one parseable sentence to emit cards;
	// give it Japanese text so its sentence splitter has something to chew on.
	_, err := f.GenerateCards(context.Background(), "光合成は植物が行う。光から糖を作る。", 1)
	if err != nil {
		t.Fatalf("fallback should not error: %v", err)
	}
}

func TestFallbackEvaluateUsesStubOnError(t *testing.T) {
	primary := &fakeProvider{name: "primary", failEval: true}
	f := NewFallback(primary)
	r, err := f.EvaluateAnswer(context.Background(), EvaluateAnswerInput{
		OriginalAnswer: "Femur", UserAnswer: "Femur",
	})
	if err != nil {
		t.Fatal(err)
	}
	if r.Score != "good" {
		t.Errorf("stub should return good for matching answer, got %q", r.Score)
	}
}

func TestStubGenerateCardsEmptyInputReturnsZero(t *testing.T) {
	s := NewStub()
	r, err := s.GenerateCards(context.Background(), "", 5)
	if err != nil {
		t.Fatal(err)
	}
	if len(r.Cards) != 0 {
		t.Errorf("empty input should produce no cards, got %d", len(r.Cards))
	}
}

func TestStubEvaluateRespectsBlankAnswer(t *testing.T) {
	s := NewStub()
	r, _ := s.EvaluateAnswer(context.Background(), EvaluateAnswerInput{
		OriginalAnswer: "x", UserAnswer: "  ",
	})
	if r.Score != "incorrect" {
		t.Errorf("blank user answer should be incorrect, got %q", r.Score)
	}
}
