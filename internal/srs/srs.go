// Package srs is the spaced-repetition scheduling kernel.
// Pure math; no time, no I/O. Card.ApplyReview feeds it the current
// clock and persists the resulting Schedule.
package srs

import "math"

type Rating string

const (
	Again Rating = "again"
	Hard  Rating = "hard"
	Good  Rating = "good"
	Easy  Rating = "easy"
)

func (r Rating) Valid() bool {
	switch r {
	case Again, Hard, Good, Easy:
		return true
	}
	return false
}

type Schedule struct {
	IntervalDays float64
	EaseFactor   float64
}

const DefaultEase = 2.5

func NextReview(rating Rating, currentInterval, currentEase float64) Schedule {
	if currentEase == 0 {
		currentEase = DefaultEase
	}
	newEase := currentEase
	var newInterval float64

	if currentInterval <= 0 {
		switch rating {
		case Again:
			newInterval = 1
			newEase = math.Max(1.3, currentEase-0.2)
		case Hard:
			newInterval = 1
			newEase = math.Max(1.3, currentEase-0.15)
		case Good:
			newInterval = 1
		case Easy:
			newInterval = 3
			newEase = math.Min(2.5, currentEase+0.15)
		}
	} else {
		switch rating {
		case Again:
			newInterval = 1
			newEase = math.Max(1.3, currentEase-0.2)
		case Hard:
			newInterval = math.Max(1, math.Round(currentInterval*1.2))
			newEase = math.Max(1.3, currentEase-0.15)
		case Good:
			newInterval = math.Round(currentInterval * currentEase)
		case Easy:
			newInterval = math.Round(currentInterval * currentEase * 1.3)
			newEase = math.Min(2.5, currentEase+0.15)
		}
	}
	if newInterval < 1 {
		newInterval = 1
	}
	return Schedule{IntervalDays: newInterval, EaseFactor: newEase}
}

// RetentionRate emulates an Ebbinghaus-style decay used by the original
// memre-app retention meter. Returns a value in [0, 100].
func RetentionRate(daysSinceReview, intervalDays float64, hasReviewed bool) float64 {
	if !hasReviewed {
		return 0
	}
	if intervalDays <= 0 {
		intervalDays = 1
	}
	if daysSinceReview <= intervalDays {
		ratio := daysSinceReview / intervalDays
		r := 100.0 * (1 - math.Pow(ratio, 1.5)*0.3)
		return clamp(r, 70, 100)
	}
	overdue := daysSinceReview - intervalDays
	r := 100.0 / (1 + overdue*0.3)
	return clamp(r, 0, 70)
}

func clamp(v, lo, hi float64) float64 {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}
