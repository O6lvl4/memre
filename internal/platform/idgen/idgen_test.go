package idgen

import "testing"

func TestSequentialIsStable(t *testing.T) {
	g := NewSequential("p-")
	if got := g.NewID(); got != "p-1" {
		t.Errorf("want p-1 got %q", got)
	}
	if got := g.NewID(); got != "p-2" {
		t.Errorf("want p-2 got %q", got)
	}
}

func TestSequentialDefaultsPrefix(t *testing.T) {
	g := NewSequential("")
	if got := g.NewID(); got != "id-1" {
		t.Errorf("default prefix want id-1 got %q", got)
	}
}

func TestCryptoIsUniqueAndHexShaped(t *testing.T) {
	g := Crypto{}
	a := g.NewID()
	b := g.NewID()
	if a == b {
		t.Errorf("crypto IDs collided in 2 calls: %s", a)
	}
	if len(a) != 24 {
		t.Errorf("expected 24-char hex, got %q (%d)", a, len(a))
	}
	for _, c := range a {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')) {
			t.Errorf("non-hex char %q in id %q", c, a)
		}
	}
}
