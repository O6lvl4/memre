// Package idgen produces opaque identifiers for new aggregates.
// Frontend-supplied IDs always take precedence; this is the fallback the
// service layer reaches for when the caller didn't pre-assign one.
package idgen

import (
	"crypto/rand"
	"encoding/hex"
)

type Generator interface {
	NewID() string
}

type Crypto struct{}

func (Crypto) NewID() string {
	var b [12]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

// Sequential is a deterministic Generator for tests. It hands out
// "id-1", "id-2", … so assertions against generated IDs stay stable.
type Sequential struct {
	Prefix  string
	counter int
}

func NewSequential(prefix string) *Sequential {
	if prefix == "" {
		prefix = "id-"
	}
	return &Sequential{Prefix: prefix}
}

func (s *Sequential) NewID() string {
	s.counter++
	return s.Prefix + itoa(s.counter)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}
