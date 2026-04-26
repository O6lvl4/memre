// Package deck is a vertical slice for the Deck context.
// Entity, value objects, service, repository interface, sqlite adapter,
// and Wails-facing handler all live here. Anything outside this package
// only sees the exported Service / Handler.
package deck

import (
	"errors"
	"strings"
)

// Level is the difficulty calibration value object.
type Level string

const (
	LevelBeginner     Level = "beginner"
	LevelIntermediate Level = "intermediate"
	LevelAdvanced     Level = "advanced"
)

func (l Level) Valid() bool {
	switch l {
	case LevelBeginner, LevelIntermediate, LevelAdvanced:
		return true
	}
	return false
}

const DefaultColor = "#4F46E5"

// Deck is the aggregate root.
type Deck struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Color       string `json:"color"`
	Description string `json:"description"`
	Level       Level  `json:"level"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

var (
	ErrEmptyName    = errors.New("deck name is required")
	ErrInvalidLevel = errors.New("deck level is invalid")
)

// new creates a Deck with invariants enforced. ID and now are injected
// from the service layer (idgen + clock) so the constructor stays pure.
func newDeck(id, name, color, description string, level Level, now string) (Deck, error) {
	if isBlank(name) {
		return Deck{}, ErrEmptyName
	}
	if color == "" {
		color = DefaultColor
	}
	if level == "" {
		level = LevelBeginner
	}
	if !level.Valid() {
		return Deck{}, ErrInvalidLevel
	}
	return Deck{
		ID: id, Name: name, Color: color, Description: description,
		Level: level, CreatedAt: now, UpdatedAt: now,
	}, nil
}

func (d Deck) rename(name, now string) (Deck, error) {
	if isBlank(name) {
		return Deck{}, ErrEmptyName
	}
	d.Name = name
	d.UpdatedAt = now
	return d, nil
}

func (d Deck) withDetails(color, description string, level Level, now string) (Deck, error) {
	if !level.Valid() {
		return Deck{}, ErrInvalidLevel
	}
	if color == "" {
		color = DefaultColor
	}
	d.Color = color
	d.Description = description
	d.Level = level
	d.UpdatedAt = now
	return d, nil
}

// Stats are derived from the cards belonging to a deck.
type Stats struct {
	TotalCards    int     `json:"totalCards"`
	NewCount      int     `json:"newCount"`
	DueCount      int     `json:"dueCount"`
	RetentionRate float64 `json:"retentionRate"`
}

// WithStats is the read model returned to the UI: a deck plus its
// computed stats. Computation happens in Service.List using cards.
type WithStats struct {
	Deck
	Stats
}

func isBlank(s string) bool { return strings.TrimSpace(s) == "" }

// Validate runs the same invariant checks that newDeck enforces, but
// against an *already constructed* Deck. Repositories call this after
// loading from storage so a malformed row (e.g. an unknown level value
// from a future schema migration) can never silently leak into the
// domain.
func (d Deck) Validate() error {
	if isBlank(d.Name) {
		return ErrEmptyName
	}
	if d.Level != "" && !d.Level.Valid() {
		return ErrInvalidLevel
	}
	return nil
}
