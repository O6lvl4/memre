// Package events provides a tiny synchronous in-process event bus.
//
// Domain code publishes typed events; subscribers are pure side-effect
// hooks (logging, denormalised view updates, gamification, …). The bus
// is deliberately *synchronous* and *fire-and-forget per subscriber* so
// that a misbehaving subscriber can never block a domain method.
//
// Cross-process / cross-machine event distribution is out of scope.
package events

import (
	"context"
	"sync"
)

// Event is the marker interface every concrete event satisfies.
// Subscribers type-assert on the concrete struct. The exported
// EventName() lets handlers log/route by name without reflection and
// — crucially — keeps the interface satisfiable from any package.
type Event interface {
	EventName() string
}

// Handler reacts to one event. Returning an error is allowed but the
// bus only logs it (via the optional ErrorLogger); domain control flow
// is never affected.
type Handler func(ctx context.Context, e Event) error

// Bus is a synchronous many-to-many publisher.
type Bus struct {
	mu          sync.RWMutex
	subscribers []Handler
	ErrorLogger func(Event, error)
}

func NewBus() *Bus { return &Bus{} }

// Subscribe registers a handler. Order of delivery is registration order.
func (b *Bus) Subscribe(h Handler) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.subscribers = append(b.subscribers, h)
}

// Publish delivers e to every subscriber. Subscriber errors are
// swallowed (optionally logged) so a faulty observer can't poison
// domain operations.
func (b *Bus) Publish(ctx context.Context, e Event) {
	b.mu.RLock()
	subs := append([]Handler(nil), b.subscribers...)
	b.mu.RUnlock()
	for _, h := range subs {
		if err := h(ctx, e); err != nil && b.ErrorLogger != nil {
			b.ErrorLogger(e, err)
		}
	}
}

// Publisher is the consumer-side port that domain services depend on.
// They never see the full Bus — only the ability to Publish.
type Publisher interface {
	Publish(ctx context.Context, e Event)
}

// Noop is a Publisher that drops everything; useful as a default in
// tests or before any subscribers are wired.
type Noop struct{}

func (Noop) Publish(context.Context, Event) {}
