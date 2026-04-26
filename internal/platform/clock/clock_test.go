package clock

import (
	"testing"
	"time"
)

func TestFakeAutoTick(t *testing.T) {
	f := NewFake(time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC))
	f.Tick = time.Hour
	a := f.Now()
	b := f.Now()
	if !b.After(a) {
		t.Errorf("auto-tick should advance, got %v then %v", a, b)
	}
	if b.Sub(a) != time.Hour {
		t.Errorf("expected 1h advance, got %v", b.Sub(a))
	}
}

func TestFakeAdvanceWithoutRead(t *testing.T) {
	f := NewFake(time.Unix(0, 0).UTC())
	f.Advance(time.Minute)
	now := f.Now()
	if now.Sub(time.Unix(0, 0).UTC()) != time.Minute {
		t.Errorf("Advance should bump NowTime, got %v", now)
	}
}

func TestSystemNowIsCloseToTimeNow(t *testing.T) {
	a := System{}.Now()
	b := time.Now()
	if delta := b.Sub(a); delta < 0 || delta > time.Second {
		t.Errorf("System.Now diverges from time.Now by %v", delta)
	}
}
