// Package clock holds the canonical Clock interface and the production
// implementation. Feature services accept any *clock.System or fake
// satisfying the same interface, so tests can stay deterministic.
package clock

import "time"

// Clock is the dependency every feature service uses for time. Defining
// it here (instead of in each consumer) avoids each package re-declaring
// the same trivial interface.
type Clock interface {
	Now() time.Time
}

type System struct{}

func (System) Now() time.Time { return time.Now() }

// Fake is a deterministic Clock for tests. Calls advance NowTime by
// Tick on every Now(), so loops produce a strictly increasing
// timeline without the caller having to mutate state by hand.
type Fake struct {
	NowTime time.Time
	Tick    time.Duration
}

func NewFake(start time.Time) *Fake {
	return &Fake{NowTime: start.UTC(), Tick: 0}
}

func (f *Fake) Now() time.Time {
	t := f.NowTime
	if f.Tick > 0 {
		f.NowTime = f.NowTime.Add(f.Tick)
	}
	return t
}

// Advance moves the fake clock forward without taking a Now reading.
func (f *Fake) Advance(d time.Duration) { f.NowTime = f.NowTime.Add(d) }
