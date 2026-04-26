// Package knowledge is the vertical slice for KnowledgeSource — the
// reference material the AI consults to generate cards.
package knowledge

import (
	"errors"
	"strings"
)

type SourceType string

const (
	SourceText SourceType = "text"
	SourceFile SourceType = "file"
)

func (t SourceType) Valid() bool { return t == SourceText || t == SourceFile }

type Source struct {
	ID        string     `json:"id"`
	DeckID    string     `json:"deckId"`
	Name      string     `json:"name"`
	Content   string     `json:"content"`
	Type      SourceType `json:"type"`
	CreatedAt string     `json:"createdAt"`
	UpdatedAt string     `json:"updatedAt"`
}

var (
	ErrEmptyName   = errors.New("knowledge source name is required")
	ErrNoDeck      = errors.New("knowledge source must belong to a deck")
	ErrInvalidType = errors.New("knowledge source type is invalid")
)

func newSource(id, deckID, name, content string, t SourceType, now string) (Source, error) {
	if isBlank(name) {
		return Source{}, ErrEmptyName
	}
	if isBlank(deckID) {
		return Source{}, ErrNoDeck
	}
	if t == "" {
		t = SourceText
	}
	if !t.Valid() {
		return Source{}, ErrInvalidType
	}
	return Source{
		ID: id, DeckID: deckID, Name: name, Content: content,
		Type: t, CreatedAt: now, UpdatedAt: now,
	}, nil
}

func (s Source) edit(name, content string, t SourceType, now string) (Source, error) {
	if isBlank(name) {
		return Source{}, ErrEmptyName
	}
	if t == "" {
		t = s.Type
	}
	if !t.Valid() {
		return Source{}, ErrInvalidType
	}
	s.Name = name
	s.Content = content
	s.Type = t
	s.UpdatedAt = now
	return s, nil
}

func isBlank(s string) bool { return strings.TrimSpace(s) == "" }

// Validate enforces the same invariants as newSource on a value
// loaded from storage. Repositories call this after Scan so a row
// that someone imported with a bogus type can never become a Source.
func (s Source) Validate() error {
	if isBlank(s.Name) {
		return ErrEmptyName
	}
	if isBlank(s.DeckID) {
		return ErrNoDeck
	}
	if !s.Type.Valid() {
		return ErrInvalidType
	}
	return nil
}
