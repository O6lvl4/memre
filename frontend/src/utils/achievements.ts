// ゲーミフィケーション: 称号・実績システム

export interface Title {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface Achievement {
  id: string;
  title: Title;
  category: 'streak' | 'mastery' | 'dedication' | 'explorer';
  requirement: number;
  currentValue: number;
  unlocked: boolean;
}

export interface UserStats {
  streak: number;
  totalReviews: number;
  totalCards: number;
  masteredCards: number;
  perfectCards: number;
  totalDecks: number;
  accuracyRate: number;
}

// より細かいマイルストーン設定
const STREAK_MILESTONES = [1, 2, 3, 5, 7, 10, 14, 21, 30, 50, 75, 100, 150, 200, 365];
const REVIEW_MILESTONES = [1, 5, 10, 25, 50, 100, 200, 300, 500, 750, 1000, 2000, 3000, 5000, 10000];
const MASTERY_MILESTONES = [1, 3, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 500];
const PERFECT_MILESTONES = [1, 3, 5, 10, 20, 30, 50, 100];
const DECK_MILESTONES = [1, 2, 3, 5, 7, 10, 15, 20];

// アイコン名（Lucide React用）
export type IconName = 'flame' | 'repeat' | 'brain' | 'gem' | 'library';

export interface TitleConfig {
  iconName: IconName;
  label: string; // 進捗バーに表示する短いラベル
}

export const CATEGORY_CONFIG: Record<string, TitleConfig> = {
  streak: { iconName: 'flame', label: '連続' },
  reviews: { iconName: 'repeat', label: '復習' },
  mastery: { iconName: 'brain', label: '定着' },
  perfect: { iconName: 'gem', label: '習得' },
  decks: { iconName: 'library', label: 'デッキ' },
};

// 称号生成関数
function createTitle(category: string, milestone: number): Title {
  const configs: Record<string, { nameTemplate: (n: number) => string; descTemplate: (n: number) => string }> = {
    streak: {
      nameTemplate: (n) => n >= 365 ? '年間継続者' : n >= 100 ? '百日修行' : n >= 30 ? '月間継続' : n >= 7 ? '週間継続' : `${n}日継続`,
      descTemplate: (n) => `${n}日連続`,
    },
    reviews: {
      nameTemplate: (n) => n >= 5000 ? '記憶の賢者' : n >= 1000 ? '熟練者' : n >= 100 ? '学習者' : '入門者',
      descTemplate: (n) => `${n}回復習`,
    },
    mastery: {
      nameTemplate: (n) => n >= 200 ? '記憶の森' : n >= 50 ? '成長中' : '芽生え',
      descTemplate: (n) => `${n}枚定着`,
    },
    perfect: {
      nameTemplate: (n) => n >= 50 ? '結晶化' : n >= 10 ? '完璧主義' : '初完璧',
      descTemplate: (n) => `${n}枚習得`,
    },
    decks: {
      nameTemplate: (n) => n >= 10 ? 'コレクター' : n >= 5 ? '多角学習' : '冒険開始',
      descTemplate: (n) => `${n}デッキ`,
    },
  };

  const config = configs[category];
  const rarity = getRarity(category, milestone);
  const categoryConfig = CATEGORY_CONFIG[category];

  return {
    id: `${category}_${milestone}`,
    name: config.nameTemplate(milestone),
    description: config.descTemplate(milestone),
    icon: categoryConfig.iconName,
    rarity,
  };
}

function getRarity(category: string, milestone: number): Title['rarity'] {
  const thresholds: Record<string, number[]> = {
    streak: [7, 30, 100, 200],
    reviews: [100, 500, 2000, 5000],
    mastery: [20, 75, 200, 500],
    perfect: [5, 20, 50, 100],
    decks: [3, 7, 15, 20],
  };
  const t = thresholds[category];
  if (milestone >= t[3]) return 'legendary';
  if (milestone >= t[2]) return 'epic';
  if (milestone >= t[1]) return 'rare';
  if (milestone >= t[0]) return 'uncommon';
  return 'common';
}

export const RARITY_COLORS = {
  common: { bg: '#F3F4F6', border: '#D1D5DB', text: '#6B7280' },
  uncommon: { bg: '#DBEAFE', border: '#93C5FD', text: '#3B82F6' },
  rare: { bg: '#EDE9FE', border: '#C4B5FD', text: '#8B5CF6' },
  epic: { bg: '#FCE7F3', border: '#F9A8D4', text: '#EC4899' },
  legendary: { bg: '#FEF3C7', border: '#FCD34D', text: '#D97706' },
};

// 現在の称号を取得（最も高いランク）
export function getCurrentTitle(stats: UserStats): Title | null {
  const titles = getUnlockedTitles(stats);
  if (titles.length === 0) return null;

  const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
  titles.sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
  return titles[0];
}

// アンロック済み称号
export function getUnlockedTitles(stats: UserStats): Title[] {
  const unlocked: Title[] = [];

  const getHighest = (value: number, milestones: number[], category: string) => {
    for (let i = milestones.length - 1; i >= 0; i--) {
      if (value >= milestones[i]) {
        unlocked.push(createTitle(category, milestones[i]));
        return;
      }
    }
  };

  getHighest(stats.streak, STREAK_MILESTONES, 'streak');
  getHighest(stats.totalReviews, REVIEW_MILESTONES, 'reviews');
  getHighest(stats.masteredCards, MASTERY_MILESTONES, 'mastery');
  getHighest(stats.perfectCards, PERFECT_MILESTONES, 'perfect');
  getHighest(stats.totalDecks, DECK_MILESTONES, 'decks');

  return unlocked;
}

// 次の目標を取得（最大2つ）
export function getNextAchievements(stats: UserStats, limit: number = 2): Achievement[] {
  const achievements: Achievement[] = [];

  const addNext = (value: number, milestones: number[], category: string, catType: Achievement['category']) => {
    for (const m of milestones) {
      if (value < m) {
        achievements.push({
          id: `${category}_${m}`,
          title: createTitle(category, m),
          category: catType,
          requirement: m,
          currentValue: value,
          unlocked: false,
        });
        return;
      }
    }
  };

  addNext(stats.streak, STREAK_MILESTONES, 'streak', 'streak');
  addNext(stats.totalReviews, REVIEW_MILESTONES, 'reviews', 'dedication');
  addNext(stats.masteredCards, MASTERY_MILESTONES, 'mastery', 'mastery');
  addNext(stats.perfectCards, PERFECT_MILESTONES, 'perfect', 'mastery');

  // 進捗率が高い順にソート
  achievements.sort((a, b) => (b.currentValue / b.requirement) - (a.currentValue / a.requirement));

  return achievements.slice(0, limit);
}

// ローカルストレージから総復習回数を取得・保存
const TOTAL_REVIEWS_KEY = 'memre_total_reviews';

export function getTotalReviews(): number {
  try {
    const stored = localStorage.getItem(TOTAL_REVIEWS_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

export function addReviews(count: number): number {
  const current = getTotalReviews();
  const newTotal = current + count;
  localStorage.setItem(TOTAL_REVIEWS_KEY, String(newTotal));
  return newTotal;
}
