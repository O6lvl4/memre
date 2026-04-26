package deck

import (
	"errors"
	"testing"
)

const ts = "2026-04-26T00:00:00Z"

func TestNewDeckHappyPath(t *testing.T) {
	d, err := newDeck("id-1", "Bio101", "#abc", "biology fundamentals", LevelIntermediate, ts)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if d.ID != "id-1" || d.Name != "Bio101" || d.Color != "#abc" ||
		d.Description != "biology fundamentals" || d.Level != LevelIntermediate ||
		d.CreatedAt != ts || d.UpdatedAt != ts {
		t.Errorf("unexpected deck %+v", d)
	}
}

func TestNewDeckDefaults(t *testing.T) {
	d, err := newDeck("id-1", "X", "", "", "", ts)
	if err != nil {
		t.Fatal(err)
	}
	if d.Color != DefaultColor {
		t.Errorf("default color want %q got %q", DefaultColor, d.Color)
	}
	if d.Level != LevelBeginner {
		t.Errorf("default level want beginner got %s", d.Level)
	}
}

func TestNewDeckRejectsEmptyName(t *testing.T) {
	if _, err := newDeck("id", "  ", "", "", LevelBeginner, ts); !errors.Is(err, ErrEmptyName) {
		t.Errorf("want ErrEmptyName, got %v", err)
	}
}

func TestNewDeckRejectsBadLevel(t *testing.T) {
	if _, err := newDeck("id", "x", "", "", Level("godlike"), ts); !errors.Is(err, ErrInvalidLevel) {
		t.Errorf("want ErrInvalidLevel, got %v", err)
	}
}

func TestRenamePreservesID(t *testing.T) {
	d, _ := newDeck("id-1", "old", "", "", LevelBeginner, ts)
	d2, err := d.rename("new", "2026-04-27T00:00:00Z")
	if err != nil {
		t.Fatal(err)
	}
	if d2.ID != d.ID || d2.CreatedAt != d.CreatedAt {
		t.Error("rename changed identity")
	}
	if d2.Name != "new" {
		t.Errorf("rename failed, got %q", d2.Name)
	}
	if d2.UpdatedAt == d.UpdatedAt {
		t.Error("rename should bump UpdatedAt")
	}
}

func TestRenameRejectsBlank(t *testing.T) {
	d, _ := newDeck("id", "x", "", "", LevelBeginner, ts)
	if _, err := d.rename("\t\n ", ts); !errors.Is(err, ErrEmptyName) {
		t.Errorf("want ErrEmptyName, got %v", err)
	}
}

func TestWithDetailsValidates(t *testing.T) {
	d, _ := newDeck("id", "x", "", "", LevelBeginner, ts)
	if _, err := d.withDetails("", "", Level("nope"), ts); !errors.Is(err, ErrInvalidLevel) {
		t.Errorf("want ErrInvalidLevel, got %v", err)
	}
	d2, err := d.withDetails("", "more info", LevelAdvanced, ts)
	if err != nil {
		t.Fatal(err)
	}
	if d2.Color != DefaultColor {
		t.Errorf("blank color should default, got %q", d2.Color)
	}
	if d2.Level != LevelAdvanced || d2.Description != "more info" {
		t.Errorf("withDetails did not apply: %+v", d2)
	}
}

func TestLevelValid(t *testing.T) {
	cases := map[Level]bool{
		LevelBeginner: true, LevelIntermediate: true, LevelAdvanced: true,
		"": false, "wizard": false,
	}
	for l, want := range cases {
		if got := l.Valid(); got != want {
			t.Errorf("%q valid want %v got %v", l, want, got)
		}
	}
}
