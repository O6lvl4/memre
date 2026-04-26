package card

import (
	"context"
	"sync"
	"testing"

	"github.com/O6lvl4/memre/internal/events"
	"github.com/O6lvl4/memre/internal/srs"
)

// captureBus is a tiny test publisher that records every event it sees.
type captureBus struct {
	mu     sync.Mutex
	events []events.Event
}

func (b *captureBus) Publish(_ context.Context, e events.Event) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.events = append(b.events, e)
}

func TestReviewPublishesReviewedEvent(t *testing.T) {
	r := newMemRepo()
	clk := newFakeClockNow()
	ids := newSeqIDs("c-")
	bus := &captureBus{}
	svc := NewService(r, clk, ids, bus)

	c, err := svc.Create(context.Background(), CreateInput{
		DeckID: "d1", Question: "Q", Answer: "A",
	})
	if err != nil {
		t.Fatal(err)
	}

	if _, err := svc.Review(context.Background(), c.ID, srs.Good); err != nil {
		t.Fatal(err)
	}
	if len(bus.events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(bus.events))
	}
	ev, ok := bus.events[0].(Reviewed)
	if !ok {
		t.Fatalf("event type mismatch: %T", bus.events[0])
	}
	if ev.CardID != c.ID || ev.DeckID != "d1" || ev.Rating != srs.Good {
		t.Errorf("event payload wrong: %+v", ev)
	}
	if ev.EventName() != "card.Reviewed" {
		t.Errorf("EventName mismatch: %q", ev.EventName())
	}
}

func TestReviewDoesNotPublishOnFailure(t *testing.T) {
	r := newMemRepo()
	clk := newFakeClockNow()
	ids := newSeqIDs("c-")
	bus := &captureBus{}
	svc := NewService(r, clk, ids, bus)

	// invalid rating fails the validation gate before any state change
	if _, err := svc.Review(context.Background(), "ghost", srs.Rating("smug")); err == nil {
		t.Error("expected error")
	}
	if len(bus.events) != 0 {
		t.Errorf("no event should be published on failure, got %d", len(bus.events))
	}
}
