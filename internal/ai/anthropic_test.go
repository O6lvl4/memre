package ai

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// fakeAnthropic mimics /v1/messages just enough to satisfy the
// Provider implementation. Tests set replyText / replyStatus per case.
type fakeAnthropic struct {
	srv         *httptest.Server
	replyText   string
	replyStatus int
	gotKey      string
	gotModel    string
}

func newFakeAnthropic() *fakeAnthropic {
	f := &fakeAnthropic{replyStatus: 200}
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/messages", func(w http.ResponseWriter, r *http.Request) {
		f.gotKey = r.Header.Get("x-api-key")
		raw, _ := io.ReadAll(r.Body)
		var body struct {
			Model string `json:"model"`
		}
		_ = json.Unmarshal(raw, &body)
		f.gotModel = body.Model
		w.WriteHeader(f.replyStatus)
		if f.replyStatus != 200 {
			_, _ = w.Write([]byte(`{"error":{"type":"x","message":"server said no"}}`))
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"content": []map[string]string{{"type": "text", "text": f.replyText}},
		})
	})
	f.srv = httptest.NewServer(mux)
	return f
}

func (f *fakeAnthropic) close() { f.srv.Close() }

func TestAnthropicStatusReportsKeyAbsence(t *testing.T) {
	a := NewAnthropic("", "")
	st := a.Status(context.Background())
	if st.Connected {
		t.Errorf("should not be connected when key is empty")
	}
}

func TestAnthropicStatusOKWithKey(t *testing.T) {
	a := NewAnthropic("sk-fake", "")
	st := a.Status(context.Background())
	if !st.Connected {
		t.Errorf("should be connected when key set")
	}
	if !st.ModelInstalled {
		t.Errorf("model installed should be true for Anthropic")
	}
}

func TestAnthropicGenerateCardsRoundtrip(t *testing.T) {
	fa := newFakeAnthropic()
	defer fa.close()
	fa.replyText = `{"cards":[{"question":"Q","answer":"A"}]}`

	a := NewAnthropic("sk-test", "claude-sonnet-4-6").WithBaseURL(fa.srv.URL)
	res, err := a.GenerateCards(context.Background(), "anything", 1)
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Cards) != 1 || res.Cards[0].Question != "Q" {
		t.Errorf("payload mangled: %+v", res)
	}
	if fa.gotKey != "sk-test" {
		t.Errorf("API key header want sk-test got %q", fa.gotKey)
	}
	if fa.gotModel != "claude-sonnet-4-6" {
		t.Errorf("model want claude-sonnet-4-6 got %q", fa.gotModel)
	}
}

func TestAnthropicHandlesCodeFences(t *testing.T) {
	fa := newFakeAnthropic()
	defer fa.close()
	fa.replyText = "```json\n{\"explanation\":\"yo\"}\n```"

	a := NewAnthropic("sk-x", "").WithBaseURL(fa.srv.URL)
	r, err := a.ExplainCard(context.Background(), ExplainCardInput{
		CardQuestion: "q", CardAnswer: "a", UserQuestion: "u",
	})
	if err != nil {
		t.Fatal(err)
	}
	if r.Explanation != "yo" {
		t.Errorf("code fence not stripped: got %q", r.Explanation)
	}
}

func TestAnthropic5xxIsError(t *testing.T) {
	fa := newFakeAnthropic()
	defer fa.close()
	fa.replyStatus = 500

	a := NewAnthropic("sk-x", "").WithBaseURL(fa.srv.URL)
	_, err := a.GenerateCards(context.Background(), "x", 1)
	if err == nil || !strings.Contains(err.Error(), "500") {
		t.Errorf("want 5xx error, got %v", err)
	}
}

func TestAnthropicKeyFuncIsCalledPerRequest(t *testing.T) {
	fa := newFakeAnthropic()
	defer fa.close()
	fa.replyText = `{"explanation":"x"}`

	calls := 0
	keys := []string{"k1", "k2"}
	a := NewAnthropicWithKeyFunc(func() string {
		k := keys[calls]
		calls++
		return k
	}, "claude-sonnet-4-6").WithBaseURL(fa.srv.URL)

	_, _ = a.ExplainCard(context.Background(), ExplainCardInput{CardQuestion: "x", CardAnswer: "y", UserQuestion: "z"})
	if fa.gotKey != "k1" {
		t.Errorf("first call should use k1, got %q", fa.gotKey)
	}
	_, _ = a.ExplainCard(context.Background(), ExplainCardInput{CardQuestion: "x", CardAnswer: "y", UserQuestion: "z"})
	if fa.gotKey != "k2" {
		t.Errorf("second call should use k2 (hot-reload), got %q", fa.gotKey)
	}
}

func TestAnthropicWithModelClonesIndependently(t *testing.T) {
	a := NewAnthropic("sk", "claude-opus-4-7")
	b := a.WithModel("claude-haiku-4-5-20251001")
	if a == b {
		t.Errorf("WithModel should return a clone")
	}
	if a.model != "claude-opus-4-7" {
		t.Errorf("original mutated: %q", a.model)
	}
	if b.model != "claude-haiku-4-5-20251001" {
		t.Errorf("clone wrong: %q", b.model)
	}
}
