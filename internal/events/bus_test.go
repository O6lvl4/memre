package events

import (
	"context"
	"errors"
	"testing"
)

type testEvent struct{ N int }

func (testEvent) EventName() string { return "test" }

func TestPublishDeliversToAllSubscribersInOrder(t *testing.T) {
	b := NewBus()
	var got []int
	b.Subscribe(func(_ context.Context, e Event) error {
		got = append(got, e.(testEvent).N*1)
		return nil
	})
	b.Subscribe(func(_ context.Context, e Event) error {
		got = append(got, e.(testEvent).N*10)
		return nil
	})
	b.Publish(context.Background(), testEvent{N: 7})
	if len(got) != 2 || got[0] != 7 || got[1] != 70 {
		t.Errorf("delivery order/values wrong: %+v", got)
	}
}

func TestSubscriberErrorIsSwallowedAndLogged(t *testing.T) {
	b := NewBus()
	var captured error
	b.ErrorLogger = func(_ Event, err error) { captured = err }

	b.Subscribe(func(context.Context, Event) error { return errors.New("boom") })
	b.Subscribe(func(_ context.Context, e Event) error {
		// must still run despite previous handler erroring
		return nil
	})
	b.Publish(context.Background(), testEvent{})

	if captured == nil || captured.Error() != "boom" {
		t.Errorf("expected ErrorLogger to capture 'boom', got %v", captured)
	}
}

func TestNoopPublisherCompiles(t *testing.T) {
	var p Publisher = Noop{}
	p.Publish(context.Background(), testEvent{})
}
