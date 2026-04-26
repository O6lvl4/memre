package srs

import (
	"math"
	"testing"
)

func TestRatingValid(t *testing.T) {
	for _, r := range []Rating{Again, Hard, Good, Easy} {
		if !r.Valid() {
			t.Errorf("expected %q valid", r)
		}
	}
	if Rating("garbage").Valid() {
		t.Error("garbage should be invalid")
	}
}

func TestNextReviewFromZero(t *testing.T) {
	cases := []struct {
		rating       Rating
		wantInterval float64
		minEase      float64
		maxEase      float64
	}{
		{Again, 1, 1.3, 2.5}, // ease drops by 0.2 from default 2.5 → 2.3
		{Hard, 1, 1.3, 2.5},
		{Good, 1, DefaultEase, DefaultEase},
		{Easy, 3, DefaultEase, 2.5},
	}
	for _, c := range cases {
		t.Run(string(c.rating), func(t *testing.T) {
			s := NextReview(c.rating, 0, 0) // 0 ease → defaults to 2.5
			if s.IntervalDays != c.wantInterval {
				t.Errorf("interval got %v want %v", s.IntervalDays, c.wantInterval)
			}
			if s.EaseFactor < c.minEase || s.EaseFactor > c.maxEase {
				t.Errorf("ease %v not in [%v,%v]", s.EaseFactor, c.minEase, c.maxEase)
			}
		})
	}
}

func TestNextReviewProgressionGood(t *testing.T) {
	// Good repeated should grow interval geometrically by ease factor.
	interval := 1.0
	ease := DefaultEase
	for i := 0; i < 5; i++ {
		s := NextReview(Good, interval, ease)
		if s.IntervalDays < interval {
			t.Fatalf("interval shrunk on Good: %v -> %v", interval, s.IntervalDays)
		}
		interval = s.IntervalDays
		ease = s.EaseFactor
	}
	if interval < 30 {
		t.Errorf("after 5 Goods expected >=30 days, got %v", interval)
	}
}

func TestNextReviewAgainResetsButFloorsEase(t *testing.T) {
	s := NextReview(Again, 90, 1.4)
	if s.IntervalDays != 1 {
		t.Errorf("Again should reset interval to 1, got %v", s.IntervalDays)
	}
	if s.EaseFactor != 1.3 { // floored at 1.3
		t.Errorf("ease floored at 1.3, got %v", s.EaseFactor)
	}
}

func TestNextReviewMinimumIntervalIs1(t *testing.T) {
	s := NextReview(Hard, 0.4, 2.5)
	if s.IntervalDays < 1 {
		t.Errorf("interval must be >= 1 day, got %v", s.IntervalDays)
	}
}

func TestRetentionRateNotReviewed(t *testing.T) {
	if r := RetentionRate(0, 0, false); r != 0 {
		t.Errorf("not reviewed should be 0, got %v", r)
	}
}

func TestRetentionRateWithinInterval(t *testing.T) {
	// Just-reviewed → very near 100. Halfway through → still >=70.
	r0 := RetentionRate(0, 10, true)
	if r0 < 99.0 {
		t.Errorf("fresh review should be ~100, got %v", r0)
	}
	rMid := RetentionRate(5, 10, true)
	if rMid < 70 || rMid > 100 {
		t.Errorf("mid-interval out of [70,100]: %v", rMid)
	}
}

func TestRetentionRateOverdue(t *testing.T) {
	// Past due decays into [0, 70].
	r := RetentionRate(20, 10, true)
	if r < 0 || r > 70 {
		t.Errorf("overdue should be [0,70], got %v", r)
	}
	// Heavy overdue trends toward 0.
	rFar := RetentionRate(1000, 1, true)
	if rFar > 1 {
		t.Errorf("far-overdue should approach 0, got %v", rFar)
	}
}

func TestClampMonotonic(t *testing.T) {
	// sanity: NextReview never produces NaN/Inf for ordinary inputs.
	for _, r := range []Rating{Again, Hard, Good, Easy} {
		s := NextReview(r, 30, 2.5)
		if math.IsNaN(s.IntervalDays) || math.IsInf(s.IntervalDays, 0) {
			t.Errorf("%s produced bad interval %v", r, s.IntervalDays)
		}
	}
}
