import { Card } from "./ui/card";
import { getMemoryLevel } from "../utils/spacedRepetition";

interface CardData {
  lastReviewedDate?: string;
  nextReviewDate?: string;
  interval?: number;
}

interface DeckLevelSummaryProps {
  cards: CardData[];
}

export function DeckLevelSummary({ cards }: DeckLevelSummaryProps) {
  // 各レベルのカード数を集計
  const levelCounts = cards.reduce((acc, card) => {
    const level = getMemoryLevel(card.interval, card.lastReviewedDate);
    acc[level.level] = (acc[level.level] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const levels = [
    { level: 0, label: "L0 - 新規", color: "#95A5A6" },
    { level: 1, label: "L1 - 1日", color: "#FFB84D" },
    { level: 2, label: "L2 - 3日", color: "#4A90E2" },
    { level: 3, label: "L3 - 1週", color: "#5DADE2" },
    { level: 4, label: "L4 - 2週", color: "#48C9B0" },
    { level: 5, label: "L5 - 1ヶ月", color: "#50C878" },
    { level: 6, label: "L6 - 3ヶ月", color: "#45B369" },
    { level: 7, label: "L7 - 6ヶ月", color: "#2ECC71" },
  ];

  const totalCards = cards.length;

  if (totalCards === 0) {
    return null;
  }

  return (
    <Card className="p-4 bg-white border-none shadow-sm">
      <h3 className="text-sm text-[#2C3E50] mb-3">デッキレベル分布</h3>
      <div className="space-y-2">
        {levels.map((levelInfo) => {
          const count = levelCounts[levelInfo.level] || 0;
          const percentage = (count / totalCards) * 100;

          if (count === 0) return null;

          return (
            <div key={levelInfo.level}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#7F8C8D]">{levelInfo.label}</span>
                <span className="text-xs text-[#2C3E50]">{count}枚</span>
              </div>
              <div className="h-1.5 bg-[#E8E8E8] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: levelInfo.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
