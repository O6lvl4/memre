package card

import (
	"time"

	"github.com/O6lvl4/memre/internal/platform/clock"
	"github.com/O6lvl4/memre/internal/platform/idgen"
)

// shared helpers for card_test.go / service_test.go / events_test.go

func newFakeClockNow() *clock.Fake {
	return clock.NewFake(time.Date(2026, 4, 26, 0, 0, 0, 0, time.UTC))
}

func newSeqIDs(prefix string) *idgen.Sequential {
	return idgen.NewSequential(prefix)
}
