package ai

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

// fakeOllama returns a server that mimics the Ollama HTTP surface used
// by the Provider implementation. Tests configure responses per-route.
type fakeOllama struct {
	srv      *httptest.Server
	tags     []string
	chatBody string
	hits     atomic.Int32
}

func newFakeOllama() *fakeOllama {
	f := &fakeOllama{}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/tags", func(w http.ResponseWriter, r *http.Request) {
		f.hits.Add(1)
		models := make([]map[string]string, 0, len(f.tags))
		for _, t := range f.tags {
			models = append(models, map[string]string{"name": t})
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"models": models})
	})
	mux.HandleFunc("/api/chat", func(w http.ResponseWriter, r *http.Request) {
		f.hits.Add(1)
		_, _ = io.Copy(io.Discard, r.Body)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"message": map[string]string{"role": "assistant", "content": f.chatBody},
		})
	})
	mux.HandleFunc("/api/generate", func(w http.ResponseWriter, r *http.Request) {
		// Used by warmup. Just OK.
		w.WriteHeader(200)
		_, _ = w.Write([]byte(`{}`))
	})
	f.srv = httptest.NewServer(mux)
	return f
}

func (f *fakeOllama) close() { f.srv.Close() }

func TestOllamaStatusReportsAvailableTags(t *testing.T) {
	fo := newFakeOllama()
	defer fo.close()
	fo.tags = []string{"gemma4:e4b", "qwen2.5:14b"}

	o := NewOllama().WithBaseURL(fo.srv.URL).WithModel("gemma4:e4b")
	st := o.Status(context.Background())
	if !st.Connected {
		t.Errorf("status should be connected")
	}
	if !st.ModelInstalled {
		t.Errorf("gemma4:e4b should be reported installed")
	}
	if len(st.AvailableTags) != 2 {
		t.Errorf("want 2 tags got %d", len(st.AvailableTags))
	}
}

func TestOllamaStatusUnreachable(t *testing.T) {
	o := NewOllama().WithBaseURL("http://127.0.0.1:1") // not listening
	st := o.Status(context.Background())
	if st.Connected {
		t.Errorf("unreachable should not be connected")
	}
	if st.Error == "" {
		t.Errorf("error should be reported")
	}
}

func TestOllamaGenerateCardsParsesJSON(t *testing.T) {
	fo := newFakeOllama()
	defer fo.close()
	fo.chatBody = `{"cards":[{"question":"Q1","answer":"A1"},{"question":"Q2","answer":"A2"}]}`

	o := NewOllama().WithBaseURL(fo.srv.URL).WithModel("gemma4:e4b")
	res, err := o.GenerateCards(context.Background(), "any source", 5)
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Cards) != 2 {
		t.Fatalf("want 2 cards got %d", len(res.Cards))
	}
	if res.Cards[0].Question != "Q1" || res.Cards[0].Answer != "A1" {
		t.Errorf("payload mangled: %+v", res.Cards[0])
	}
}

func TestOllamaGenerateCardsRespectsCap(t *testing.T) {
	fo := newFakeOllama()
	defer fo.close()
	// Server returns 5; caller asked for 2 → trimmed.
	fo.chatBody = `{"cards":[
		{"question":"Q1","answer":"A1"},
		{"question":"Q2","answer":"A2"},
		{"question":"Q3","answer":"A3"},
		{"question":"Q4","answer":"A4"},
		{"question":"Q5","answer":"A5"}]}`

	o := NewOllama().WithBaseURL(fo.srv.URL).WithModel("x")
	res, _ := o.GenerateCards(context.Background(), "x", 2)
	if len(res.Cards) != 2 {
		t.Errorf("cap not enforced, got %d", len(res.Cards))
	}
}

func TestOllamaChatErrorOn500(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/chat", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(500)
		_, _ = w.Write([]byte("kaboom"))
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	o := NewOllama().WithBaseURL(srv.URL).WithModel("x")
	_, err := o.GenerateCards(context.Background(), "x", 1)
	if err == nil || !strings.Contains(err.Error(), "status 500") {
		t.Errorf("want 500 error, got %v", err)
	}
}

func TestOllamaEvaluateAnswerJSON(t *testing.T) {
	fo := newFakeOllama()
	defer fo.close()
	fo.chatBody = `{"score":"good","feedback":"OK","suggestion":"keep going"}`

	o := NewOllama().WithBaseURL(fo.srv.URL).WithModel("x")
	r, err := o.EvaluateAnswer(context.Background(), EvaluateAnswerInput{
		OriginalAnswer: "Femur", UserAnswer: "Femur",
	})
	if err != nil {
		t.Fatal(err)
	}
	if r.Score != "good" || r.Feedback != "OK" {
		t.Errorf("parse mismatch: %+v", r)
	}
}
