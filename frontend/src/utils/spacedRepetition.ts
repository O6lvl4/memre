// 間隔反復アルゴリズム（SM-2ベース）

export interface CardSchedule {
  nextReviewDate: string;
  interval: number;
  easeFactor: number;
}

/**
 * カードの定着率を計算（0-100）
 * 次回復習日までの進捗に基づいて計算
 */
export function calculateRetentionRate(
  lastReviewedDate?: string,
  nextReviewDate?: string,
  interval?: number
): number {
  if (!lastReviewedDate || !nextReviewDate) {
    return 0; // 未復習
  }

  const now = new Date();
  const lastReview = new Date(lastReviewedDate);
  const nextReview = new Date(nextReviewDate);

  // 経過日数
  const daysPassed = Math.floor(
    (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24)
  );

  // 復習間隔
  const reviewInterval = interval || 1;

  // 定着率の計算（エビングハウスの忘却曲線を模擬）
  // 復習直後は100%、次回復習日に向けて減少
  if (now <= nextReview) {
    // まだ復習期限内
    const progressRatio = daysPassed / reviewInterval;
    // 非線形な減衰（最初は緩やか、期限が近づくと急激に減少）
    const retentionRate = 100 * (1 - Math.pow(progressRatio, 1.5) * 0.3);
    return Math.max(70, Math.min(100, retentionRate));
  } else {
    // 期限を過ぎている
    const overdueDays = Math.floor(
      (now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24)
    );
    const decayRate = 100 / (1 + overdueDays * 0.3);
    return Math.max(0, Math.min(70, decayRate));
  }
}

/**
 * デッキの平均定着率を計算
 */
export function calculateDeckRetentionRate(
  cards: Array<{
    lastReviewedDate?: string;
    nextReviewDate?: string;
    interval?: number;
  }>
): number {
  if (cards.length === 0) return 0;

  const totalRetention = cards.reduce((sum, card) => {
    return sum + calculateRetentionRate(
      card.lastReviewedDate,
      card.nextReviewDate,
      card.interval
    );
  }, 0);

  return Math.round(totalRetention / cards.length);
}

/**
 * 復習評価に基づいて次回復習スケジュールを計算
 * エビングハウスの忘却曲線に沿ったレベルシステム
 * @param rating - "again" | "hard" | "good" | "easy"
 * @param currentInterval - 現在の間隔（日数）
 * @param currentEaseFactor - 現在の難易度係数
 */
export function calculateNextReview(
  rating: "again" | "hard" | "good" | "easy",
  currentInterval: number = 0,
  currentEaseFactor: number = 2.5
): CardSchedule {
  let newInterval: number;
  let newEaseFactor = currentEaseFactor;

  // レベル定義に基づく標準間隔
  const levelIntervals = [0, 1, 3, 7, 14, 30, 90, 180];

  // 未復習カード（currentInterval = 0 or undefined）の場合
  if (!currentInterval || currentInterval === 0) {
    switch (rating) {
      case "again":
        newInterval = 1; // L1: 1日
        newEaseFactor = Math.max(1.3, currentEaseFactor - 0.2);
        break;
      case "hard":
        newInterval = 1; // L1: 1日
        newEaseFactor = Math.max(1.3, currentEaseFactor - 0.15);
        break;
      case "good":
        newInterval = 1; // L1: 1日
        break;
      case "easy":
        newInterval = 3; // L2: 3日（1レベルスキップ）
        newEaseFactor = Math.min(2.5, currentEaseFactor + 0.15);
        break;
    }
  } else {
    // 既に復習済みのカード
    switch (rating) {
      case "again":
        // もう一度：L1（1日後）に戻る
        newInterval = 1;
        newEaseFactor = Math.max(1.3, currentEaseFactor - 0.2);
        break;

      case "hard":
        // 難しい：同じレベルを繰り返す or 微増
        newInterval = Math.max(1, Math.round(currentInterval * 1.2));
        newEaseFactor = Math.max(1.3, currentEaseFactor - 0.15);
        break;

      case "good":
        // 普通：次のレベルへ進む
        // 現在の間隔から次のレベルを見つける
        let nextLevelInterval = currentInterval;
        for (let i = 0; i < levelIntervals.length; i++) {
          if (currentInterval < levelIntervals[i]) {
            nextLevelInterval = levelIntervals[i];
            break;
          }
        }
        // 最後のレベルを超えている場合は×2
        if (nextLevelInterval === currentInterval) {
          nextLevelInterval = currentInterval * 2;
        }
        newInterval = nextLevelInterval;
        break;

      case "easy":
        // 簡単：次のレベルをスキップ
        let skipLevelInterval = currentInterval;
        let skipped = false;
        for (let i = 0; i < levelIntervals.length; i++) {
          if (currentInterval < levelIntervals[i]) {
            // 1つ飛ばす
            const targetIndex = Math.min(i + 1, levelIntervals.length - 1);
            skipLevelInterval = levelIntervals[targetIndex];
            skipped = true;
            break;
          }
        }
        // 最後のレベルを超えている場合は×2.5
        if (!skipped) {
          skipLevelInterval = Math.round(currentInterval * 2.5);
        }
        newInterval = skipLevelInterval;
        newEaseFactor = Math.min(2.5, currentEaseFactor + 0.15);
        break;
    }
  }

  // 最小間隔は1日
  newInterval = Math.max(1, newInterval);

  // 次回復習日を計算
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    nextReviewDate: nextReviewDate.toISOString(),
    interval: newInterval,
    easeFactor: newEaseFactor,
  };
}

/**
 * カードが復習期限かどうかをチェック
 */
export function isDue(nextReviewDate?: string): boolean {
  if (!nextReviewDate) return true; // 未復習カードは復習対象
  return new Date() >= new Date(nextReviewDate);
}

/**
 * エビングハウスの忘却曲線に基づくレベル定義
 * 復習間隔で段階を定義し、指数的に間隔を伸ばす
 */
export function getMemoryLevel(interval?: number, lastReviewedDate?: string): {
  level: number; // 0-7
  label: string;
  nextInterval: number; // 次のレベルまでの日数
  description: string;
  color: string;
} {
  // 未復習
  if (!interval || !lastReviewedDate) {
    return { 
      level: 0, 
      label: "L0 - 新規", 
      nextInterval: 0,
      description: "未学習",
      color: "#95A5A6" // グレー
    };
  }

  // レベル判定（復習間隔に基づく）
  if (interval < 1) {
    return { 
      level: 0, 
      label: "L0 - 直後", 
      nextInterval: 1,
      description: "学習直後",
      color: "#FFD93D" // 黄
    };
  } else if (interval === 1) {
    return { 
      level: 1, 
      label: "L1 - 1日", 
      nextInterval: 3,
      description: "1日目の定着",
      color: "#FFB84D" // オレンジ
    };
  } else if (interval <= 3) {
    return { 
      level: 2, 
      label: "L2 - 3日", 
      nextInterval: 7,
      description: "記憶の再安定化",
      color: "#4A90E2" // 青
    };
  } else if (interval <= 7) {
    return { 
      level: 3, 
      label: "L3 - 1週", 
      nextInterval: 14,
      description: "短期→中期",
      color: "#5DADE2" // 明るい青
    };
  } else if (interval <= 14) {
    return { 
      level: 4, 
      label: "L4 - 2週", 
      nextInterval: 30,
      description: "中期定着",
      color: "#48C9B0" // ターコイズ
    };
  } else if (interval <= 30) {
    return { 
      level: 5, 
      label: "L5 - 1ヶ月", 
      nextInterval: 90,
      description: "長期化の入り口",
      color: "#50C878" // 緑
    };
  } else if (interval <= 90) {
    return { 
      level: 6, 
      label: "L6 - 3ヶ月", 
      nextInterval: 180,
      description: "長期維持",
      color: "#45B369" // 濃い緑
    };
  } else {
    return { 
      level: 7, 
      label: "L7 - 6ヶ月", 
      nextInterval: 365,
      description: "長期記憶",
      color: "#2ECC71" // 鮮やかな緑
    };
  }
}

/**
 * カードの復習タイミングステータスを取得
 */
export function getReviewStatus(nextReviewDate?: string): {
  status: "new" | "due" | "overdue" | "upcoming" | "future";
  daysUntilDue: number;
  urgency: number; // 0-100: 緊急度
} {
  if (!nextReviewDate) {
    return { status: "new", daysUntilDue: 0, urgency: 100 };
  }

  const now = new Date();
  const next = new Date(nextReviewDate);
  const diffTime = next.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // 遅延
    const overdueDays = Math.abs(diffDays);
    return {
      status: "overdue",
      daysUntilDue: diffDays,
      urgency: Math.min(100, 100 + overdueDays * 5), // 遅延するほど緊急
    };
  } else if (diffDays === 0) {
    // 今日が復習日
    return { status: "due", daysUntilDue: 0, urgency: 90 };
  } else if (diffDays <= 2) {
    // 近日中（今後2日以内）
    return { status: "upcoming", daysUntilDue: diffDays, urgency: 70 - diffDays * 10 };
  } else {
    // まだ先
    return { status: "future", daysUntilDue: diffDays, urgency: Math.max(0, 50 - diffDays * 2) };
  }
}

/**
 * デッキの復習優先度を計算
 */
export function calculateDeckPriority(
  cards: Array<{
    lastReviewedDate?: string;
    nextReviewDate?: string;
    interval?: number;
  }>
): {
  overdueCount: number;
  dueCount: number;
  upcomingCount: number;
  averageUrgency: number;
  priority: number; // 0-100: 優先度スコア
} {
  if (cards.length === 0) {
    return {
      overdueCount: 0,
      dueCount: 0,
      upcomingCount: 0,
      averageUrgency: 0,
      priority: 0,
    };
  }

  let overdueCount = 0;
  let dueCount = 0;
  let upcomingCount = 0;
  let totalUrgency = 0;

  cards.forEach((card) => {
    const status = getReviewStatus(card.nextReviewDate);
    totalUrgency += status.urgency;

    if (status.status === "overdue") overdueCount++;
    else if (status.status === "due") dueCount++;
    else if (status.status === "upcoming") upcomingCount++;
  });

  const averageUrgency = totalUrgency / cards.length;
  
  // 優先度スコア計算
  // 遅延カードが最も重要、次に今日のカード
  const priority = Math.min(
    100,
    overdueCount * 20 + dueCount * 15 + upcomingCount * 5 + averageUrgency * 0.3
  );

  return {
    overdueCount,
    dueCount,
    upcomingCount,
    averageUrgency: Math.round(averageUrgency),
    priority: Math.round(priority),
  };
}

// ストリーク追跡用のストレージキー
const STREAK_STORAGE_KEY = 'memre_review_dates';

/**
 * 復習した日を記録
 */
export function recordReviewDate(): void {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const storedDates = getStoredReviewDates();

  if (!storedDates.includes(today)) {
    storedDates.push(today);
    // 直近90日分のみ保持
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    const filteredDates = storedDates.filter(d => d >= cutoffStr);
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(filteredDates));
  }
}

/**
 * 保存された復習日リストを取得
 */
function getStoredReviewDates(): string[] {
  try {
    const stored = localStorage.getItem(STREAK_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * 連続学習日数（ストリーク）を計算
 */
export function calculateStreak(): number {
  const reviewDates = getStoredReviewDates().sort().reverse(); // 新しい順

  if (reviewDates.length === 0) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // 今日か昨日に復習していない場合はストリーク0
  if (reviewDates[0] !== todayStr && reviewDates[0] !== yesterdayStr) {
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
      // 連続が途切れた
      break;
    }
  }

  return streak;
}
