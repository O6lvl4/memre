package card

import (
	"errors"
	"testing"
	"time"

	"github.com/O6lvl4/memre/internal/srs"
)

const ts = "2026-04-26T00:00:00Z"

func TestNewCardInvariants(t *testing.T) {
	t.Run("happy", func(t *testing.T) {
		c, err := newCard("c1", "d1", "Q?", "A.", ts)
		if err != nil {
			t.Fatal(err)
		}
		if c.EaseFactor != srs.DefaultEase {
			t.Errorf("default ease want %v got %v", srs.DefaultEase, c.EaseFactor)
		}
		if !c.IsNew() {
			t.Error("freshly created card should be IsNew")
		}
	})
	for _, tc := range []struct {
		name string
		q, a, deck string
		want error
	}{
		{"empty Q", "", "a", "d", ErrEmptyQuestion},
		{"empty A", "q", "", "d", ErrEmptyAnswer},
		{"empty deck", "q", "a", "", ErrNoDeck},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := newCard("c1", tc.deck, tc.q, tc.a, ts); !errors.Is(err, tc.want) {
				t.Errorf("want %v got %v", tc.want, err)
			}
		})
	}
}

func TestEditQAPreservesSchedule(t *testing.T) {
	c, _ := newCard("c", "d", "q", "a", ts)
	c.IntervalDays = 7
	c.EaseFactor = 2.6
	c.LastReviewedDate = "2026-04-20T00:00:00Z"
	c.NextReviewDate = "2026-04-27T00:00:00Z"

	c2, err := c.editQA("q2", "a2", "2026-04-27T01:00:00Z")
	if err != nil {
		t.Fatal(err)
	}
	if c2.IntervalDays != 7 || c2.EaseFactor != 2.6 ||
		c2.LastReviewedDate != "2026-04-20T00:00:00Z" ||
		c2.NextReviewDate != "2026-04-27T00:00:00Z" {
		t.Errorf("editQA mutated SRS state: %+v", c2)
	}
	if c2.Question != "q2" || c2.Answer != "a2" {
		t.Errorf("Q/A not updated: %+v", c2)
	}
}

func TestApplyReviewAdvancesSchedule(t *testing.T) {
	now := time.Date(2026, 4, 26, 12, 0, 0, 0, time.UTC)
	c, _ := newCard("c", "d", "q", "a", ts)
	c2 := c.applyReview(srs.Good, now)
	if c2.LastReviewedDate == "" || c2.NextReviewDate == "" {
		t.Errorf("review should set timestamps: %+v", c2)
	}
	if c2.ReviewCount != 1 {
		t.Errorf("review count want 1 got %d", c2.ReviewCount)
	}
	if c2.LapseCount != 0 {
		t.Errorf("good review should not lapse")
	}
	if c2.IntervalDays < 1 {
		t.Errorf("interval should be >=1, got %v", c2.IntervalDays)
	}
}

func TestApplyReviewAgainIncrementsLapse(t *testing.T) {
	now := time.Date(2026, 4, 26, 12, 0, 0, 0, time.UTC)
	c, _ := newCard("c", "d", "q", "a", ts)
	c.IntervalDays = 14
	c2 := c.applyReview(srs.Again, now)
	if c2.LapseCount != 1 {
		t.Errorf("Again should bump lapse, got %d", c2.LapseCount)
	}
	if c2.IntervalDays != 1 {
		t.Errorf("Again should reset interval to 1, got %v", c2.IntervalDays)
	}
}

func TestIsDue(t *testing.T) {
	now := time.Date(2026, 4, 26, 12, 0, 0, 0, time.UTC)
	cases := []struct {
		name string
		c    Card
		want bool
	}{
		{
			name: "new",
			c:    Card{LastReviewedDate: ""},
			want: false,
		},
		{
			name: "due in past",
			c:    Card{LastReviewedDate: ts, NextReviewDate: "2026-04-25T00:00:00Z"},
			want: true,
		},
		{
			name: "future",
			c:    Card{LastReviewedDate: ts, NextReviewDate: "2026-12-31T00:00:00Z"},
			want: false,
		},
		{
			name: "exact moment",
			c:    Card{LastReviewedDate: ts, NextReviewDate: now.Format(time.RFC3339)},
			want: true,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.c.IsDue(now); got != tc.want {
				t.Errorf("want %v got %v", tc.want, got)
			}
		})
	}
}
