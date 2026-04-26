// Package card is the vertical slice for the FlashCard context.
package card

import (
	"errors"
	"strings"
	"time"

	"github.com/O6lvl4/memre/internal/srs"
)

// Card is the entity studied by the user. SRS state lives inline because
// it's part of the card lifecycle; the math is delegated to the srs pkg.
type Card struct {
	ID               string  `json:"id"`
	DeckID           string  `json:"deckId"`
	Question         string  `json:"question"`
	Answer           string  `json:"answer"`
	LastReviewedDate string  `json:"lastReviewedDate"`
	NextReviewDate   string  `json:"nextReviewDate"`
	IntervalDays     float64 `json:"interval"`
	EaseFactor       float64 `json:"easeFactor"`
	ReviewCount      int     `json:"reviewCount"`
	LapseCount       int     `json:"lapseCount"`
	CreatedAt        string  `json:"createdAt"`
	UpdatedAt        string  `json:"updatedAt"`
}

var (
	ErrEmptyQuestion = errors.New("card question is required")
	ErrEmptyAnswer   = errors.New("card answer is required")
	ErrNoDeck        = errors.New("card must belong to a deck")
	ErrInvalidRating = errors.New("invalid review rating")
)

func newCard(id, deckID, question, answer, now string) (Card, error) {
	if isBlank(question) {
		return Card{}, ErrEmptyQuestion
	}
	if isBlank(answer) {
		return Card{}, ErrEmptyAnswer
	}
	if isBlank(deckID) {
		return Card{}, ErrNoDeck
	}
	return Card{
		ID: id, DeckID: deckID, Question: question, Answer: answer,
		EaseFactor: srs.DefaultEase,
		CreatedAt:  now, UpdatedAt: now,
	}, nil
}

func (c Card) editQA(question, answer, now string) (Card, error) {
	if isBlank(question) {
		return Card{}, ErrEmptyQuestion
	}
	if isBlank(answer) {
		return Card{}, ErrEmptyAnswer
	}
	c.Question = question
	c.Answer = answer
	c.UpdatedAt = now
	return c, nil
}

// IsNew reports whether the card has never been reviewed.
func (c Card) IsNew() bool { return c.LastReviewedDate == "" }

// IsDue reports whether the card's next-review timestamp is in the past.
func (c Card) IsDue(now time.Time) bool {
	if c.NextReviewDate == "" {
		return !c.IsNew()
	}
	t, err := time.Parse(time.RFC3339, c.NextReviewDate)
	if err != nil {
		return false
	}
	return !now.Before(t)
}

// applyReview computes the next schedule via the SRS kernel and returns
// a new Card with all bookkeeping fields advanced.
func (c Card) applyReview(rating srs.Rating, now time.Time) Card {
	sched := srs.NextReview(rating, c.IntervalDays, c.EaseFactor)
	c.IntervalDays = sched.IntervalDays
	c.EaseFactor = sched.EaseFactor
	c.LastReviewedDate = now.UTC().Format(time.RFC3339)
	c.NextReviewDate = now.UTC().Add(time.Duration(sched.IntervalDays*24) * time.Hour).Format(time.RFC3339)
	c.ReviewCount++
	if rating == srs.Again {
		c.LapseCount++
	}
	c.UpdatedAt = c.LastReviewedDate
	return c
}

func isBlank(s string) bool { return strings.TrimSpace(s) == "" }
