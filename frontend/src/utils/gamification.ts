// Duolingo風ゲーミフィケーションシステム

// ========== XP System ==========
const XP_STORAGE_KEY = 'memre_xp';
const DAILY_XP_KEY = 'memre_daily_xp';
const DAILY_GOAL_KEY = 'memre_daily_goal';
const STREAK_FREEZE_KEY = 'memre_streak_freeze';
const REVIEW_DATES_KEY = 'memre_review_dates';

// XP付与ルール
export const XP_REWARDS = {
  cardReviewed: 10,      // 1枚復習
  ratingBonus: {
    again: 0,
    hard: 2,
    good: 5,
    easy: 10,
  },
  streakBonus: (streak: number) => Math.min(streak * 2, 50), // 最大50XPボーナス
  perfectSession: 20,    // セッション全問正解ボーナス
} as const;

// レベル定義（累計XPの閾値）
export const LEVELS = [
  { level: 1, xpRequired: 0, name: '初心者' },
  { level: 2, xpRequired: 100, name: '見習い' },
  { level: 3, xpRequired: 300, name: '学習者' },
  { level: 4, xpRequired: 600, name: '努力家' },
  { level: 5, xpRequired: 1000, name: '熟練者' },
  { level: 6, xpRequired: 1500, name: '上級者' },
  { level: 7, xpRequired: 2200, name: '達人' },
  { level: 8, xpRequired: 3000, name: 'マスター' },
  { level: 9, xpRequired: 4000, name: 'グランドマスター' },
  { level: 10, xpRequired: 5500, name: 'レジェンド' },
  { level: 11, xpRequired: 7500, name: '伝説' },
  { level: 12, xpRequired: 10000, name: '神' },
];

export interface XPState {
  totalXP: number;
  todayXP: number;
  dailyGoal: number;
  level: number;
  levelName: string;
  xpToNextLevel: number;
  levelProgress: number; // 0-100
}

export interface ReviewXPResult {
  baseXP: number;
  ratingBonus: number;
  streakBonus: number;
  totalXP: number;
}

// ========== XP Functions ==========

export function getTotalXP(): number {
  try {
    return parseInt(localStorage.getItem(XP_STORAGE_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

export function getDailyXP(): { xp: number; date: string } {
  try {
    const stored = localStorage.getItem(DAILY_XP_KEY);
    if (!stored) return { xp: 0, date: '' };
    const data = JSON.parse(stored);
    const today = new Date().toISOString().split('T')[0];
    // 日付が今日でなければリセット
    if (data.date !== today) {
      return { xp: 0, date: today };
    }
    return data;
  } catch {
    return { xp: 0, date: '' };
  }
}

export function getDailyGoal(): number {
  try {
    return parseInt(localStorage.getItem(DAILY_GOAL_KEY) || '50', 10);
  } catch {
    return 50;
  }
}

export function setDailyGoal(goal: number): void {
  localStorage.setItem(DAILY_GOAL_KEY, String(goal));
}

export function addXP(amount: number): { totalXP: number; todayXP: number; leveledUp: boolean; newLevel?: number } {
  const currentTotal = getTotalXP();
  const newTotal = currentTotal + amount;
  localStorage.setItem(XP_STORAGE_KEY, String(newTotal));

  // 今日のXPを更新
  const today = new Date().toISOString().split('T')[0];
  const dailyData = getDailyXP();
  const newDailyXP = (dailyData.date === today ? dailyData.xp : 0) + amount;
  localStorage.setItem(DAILY_XP_KEY, JSON.stringify({ xp: newDailyXP, date: today }));

  // レベルアップチェック
  const oldLevel = getLevelFromXP(currentTotal);
  const newLevel = getLevelFromXP(newTotal);
  const leveledUp = newLevel.level > oldLevel.level;

  return {
    totalXP: newTotal,
    todayXP: newDailyXP,
    leveledUp,
    newLevel: leveledUp ? newLevel.level : undefined,
  };
}

export function getLevelFromXP(xp: number): { level: number; name: string; xpToNext: number; progress: number } {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];

  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xpRequired) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || LEVELS[i];
    } else {
      break;
    }
  }

  const xpInCurrentLevel = xp - currentLevel.xpRequired;
  const xpNeededForNextLevel = nextLevel.xpRequired - currentLevel.xpRequired;
  const progress = xpNeededForNextLevel > 0
    ? Math.min(100, (xpInCurrentLevel / xpNeededForNextLevel) * 100)
    : 100;

  return {
    level: currentLevel.level,
    name: currentLevel.name,
    xpToNext: Math.max(0, nextLevel.xpRequired - xp),
    progress,
  };
}

export function getXPState(): XPState {
  const totalXP = getTotalXP();
  const dailyData = getDailyXP();
  const today = new Date().toISOString().split('T')[0];
  const todayXP = dailyData.date === today ? dailyData.xp : 0;
  const dailyGoal = getDailyGoal();
  const levelInfo = getLevelFromXP(totalXP);

  return {
    totalXP,
    todayXP,
    dailyGoal,
    level: levelInfo.level,
    levelName: levelInfo.name,
    xpToNextLevel: levelInfo.xpToNext,
    levelProgress: levelInfo.progress,
  };
}

// 復習結果からXPを計算
export function calculateReviewXP(
  rating: 'again' | 'hard' | 'good' | 'easy',
  streak: number
): ReviewXPResult {
  const baseXP = XP_REWARDS.cardReviewed;
  const ratingBonus = XP_REWARDS.ratingBonus[rating];
  const streakBonus = streak > 0 ? Math.floor(XP_REWARDS.streakBonus(streak) / 10) : 0; // 10枚ごとにストリークボーナス

  return {
    baseXP,
    ratingBonus,
    streakBonus,
    totalXP: baseXP + ratingBonus + streakBonus,
  };
}

// セッション完了時のXP計算
export function calculateSessionXP(
  reviews: Array<{ rating: 'again' | 'hard' | 'good' | 'easy' }>,
  streak: number
): { totalXP: number; breakdown: { cards: number; bonus: number; streak: number; perfect: number } } {
  let cardsXP = 0;
  let bonusXP = 0;
  let perfectCount = 0;

  reviews.forEach(review => {
    cardsXP += XP_REWARDS.cardReviewed;
    bonusXP += XP_REWARDS.ratingBonus[review.rating];
    if (review.rating === 'good' || review.rating === 'easy') {
      perfectCount++;
    }
  });

  const streakXP = streak > 0 ? XP_REWARDS.streakBonus(streak) : 0;
  const perfectXP = perfectCount === reviews.length && reviews.length >= 5 ? XP_REWARDS.perfectSession : 0;

  return {
    totalXP: cardsXP + bonusXP + streakXP + perfectXP,
    breakdown: {
      cards: cardsXP,
      bonus: bonusXP,
      streak: streakXP,
      perfect: perfectXP,
    },
  };
}

// ========== Streak Freeze ==========

export function getStreakFreezeCount(): number {
  try {
    return parseInt(localStorage.getItem(STREAK_FREEZE_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

export function addStreakFreeze(count: number = 1): number {
  const current = getStreakFreezeCount();
  const newCount = Math.min(current + count, 5); // 最大5個
  localStorage.setItem(STREAK_FREEZE_KEY, String(newCount));
  return newCount;
}

export function useStreakFreeze(): boolean {
  const current = getStreakFreezeCount();
  if (current > 0) {
    localStorage.setItem(STREAK_FREEZE_KEY, String(current - 1));
    return true;
  }
  return false;
}

// ========== Enhanced Streak ==========

function getStoredReviewDates(): string[] {
  try {
    const stored = localStorage.getItem(REVIEW_DATES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function recordReviewDate(): void {
  const today = new Date().toISOString().split('T')[0];
  const storedDates = getStoredReviewDates();

  if (!storedDates.includes(today)) {
    storedDates.push(today);
    // 直近90日分のみ保持
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    const filteredDates = storedDates.filter(d => d >= cutoffStr);
    localStorage.setItem(REVIEW_DATES_KEY, JSON.stringify(filteredDates));
  }
}

export function calculateStreak(): number {
  const reviewDates = getStoredReviewDates().sort().reverse();
  if (reviewDates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // 今日か昨日に復習していない場合
  if (reviewDates[0] !== todayStr && reviewDates[0] !== yesterdayStr) {
    // ストリークフリーズを使用
    if (reviewDates[0] === new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) {
      if (useStreakFreeze()) {
        // フリーズを使って昨日の分を補填
        const dates = getStoredReviewDates();
        dates.push(yesterdayStr);
        localStorage.setItem(REVIEW_DATES_KEY, JSON.stringify(dates));
        return calculateStreak(); // 再計算
      }
    }
    return 0;
  }

  let streak = 0;
  let expectedDate = new Date(reviewDates[0]);

  for (const dateStr of reviewDates) {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    expectedDate.setHours(0, 0, 0, 0);

    if (date.getTime() === expectedDate.getTime()) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (date.getTime() < expectedDate.getTime()) {
      break;
    }
  }

  return streak;
}

// ========== Daily Goal Presets ==========
export const DAILY_GOAL_PRESETS = [
  { value: 30, label: 'カジュアル', description: '1日3枚程度' },
  { value: 50, label: '普通', description: '1日5枚程度' },
  { value: 100, label: '真剣', description: '1日10枚程度' },
  { value: 200, label: '本気', description: '1日20枚程度' },
];
