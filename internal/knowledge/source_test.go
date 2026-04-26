package knowledge

import (
	"errors"
	"testing"
)

const ts = "2026-04-26T00:00:00Z"

func TestNewSource(t *testing.T) {
	s, err := newSource("s1", "d1", "notes", "hello", SourceText, ts)
	if err != nil {
		t.Fatal(err)
	}
	if s.Type != SourceText {
		t.Errorf("type want text got %s", s.Type)
	}
}

func TestNewSourceTypeDefaultsToText(t *testing.T) {
	s, err := newSource("s1", "d1", "notes", "x", "", ts)
	if err != nil {
		t.Fatal(err)
	}
	if s.Type != SourceText {
		t.Errorf("default want text got %s", s.Type)
	}
}

func TestNewSourceValidation(t *testing.T) {
	for _, tc := range []struct {
		name string
		err  error
		fn   func() (Source, error)
	}{
		{"blank name", ErrEmptyName, func() (Source, error) {
			return newSource("s", "d", "  ", "x", SourceText, ts)
		}},
		{"no deck", ErrNoDeck, func() (Source, error) {
			return newSource("s", "", "n", "x", SourceText, ts)
		}},
		{"bad type", ErrInvalidType, func() (Source, error) {
			return newSource("s", "d", "n", "x", SourceType("invoice"), ts)
		}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := tc.fn(); !errors.Is(err, tc.err) {
				t.Errorf("want %v got %v", tc.err, err)
			}
		})
	}
}

func TestEditPreservesIDAndCreated(t *testing.T) {
	s, _ := newSource("s", "d", "n", "x", SourceText, ts)
	s2, err := s.edit("n2", "y", SourceFile, "2026-04-27T00:00:00Z")
	if err != nil {
		t.Fatal(err)
	}
	if s2.ID != s.ID || s2.CreatedAt != s.CreatedAt {
		t.Error("edit changed identity")
	}
	if s2.Type != SourceFile || s2.Content != "y" || s2.Name != "n2" {
		t.Errorf("edit did not apply: %+v", s2)
	}
	if s2.UpdatedAt == s.UpdatedAt {
		t.Error("UpdatedAt should bump")
	}
}

func TestEditEmptyTypeKeepsExisting(t *testing.T) {
	s, _ := newSource("s", "d", "n", "x", SourceFile, ts)
	s2, err := s.edit("n2", "y", "", ts)
	if err != nil {
		t.Fatal(err)
	}
	if s2.Type != SourceFile {
		t.Errorf("empty type should keep existing, got %s", s2.Type)
	}
}
