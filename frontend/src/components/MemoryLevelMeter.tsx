import { Calendar, TrendingUp } from "lucide-react";
import { getMemoryLevel } from "../utils/spacedRepetition";

interface MemoryLevelMeterProps {
  interval?: number;
  lastReviewedDate?: string;
  nextReviewDate?: string;
  size?: "sm" | "md" | "lg";
  showNextReview?: boolean;
}

export function MemoryLevelMeter({
  interval,
  lastReviewedDate,
  nextReviewDate,
  size = "md",
  showNextReview = false,
}: MemoryLevelMeterProps) {
  const memoryLevel = getMemoryLevel(interval, lastReviewedDate);
  const maxLevel = 7;

  const sizes = {
    sm: {
      text: "text-xs",
      levelSize: "w-6 h-6 text-xs",
      barHeight: "h-1.5",
    },
    md: {
      text: "text-sm",
      levelSize: "w-8 h-8 text-sm",
      barHeight: "h-2",
    },
    lg: {
      text: "text-base",
      levelSize: "w-10 h-10 text-base",
      barHeight: "h-3",
    },
  };

  const currentSize = sizes[size];

  // 次回復習日の計算
  const formatNextReview = () => {
    if (!nextReviewDate) return null;
    const next = new Date(nextReviewDate);
    const now = new Date();
    const diffTime = next.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)}日遅れ`;
    } else if (diffDays === 0) {
      return "今日";
    } else if (diffDays === 1) {
      return "明日";
    } else if (diffDays <= 7) {
      return `${diffDays}日後`;
    } else if (diffDays <= 30) {
      return `${Math.round(diffDays / 7)}週間後`;
    } else if (diffDays <= 90) {
      return `${Math.round(diffDays / 30)}ヶ月後`;
    } else {
      return next.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: memoryLevel.color }} />
          <span className={`${currentSize.text} text-[#7F8C8D]`}>
            記憶レベル
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`${currentSize.text} font-medium`}
            style={{ color: memoryLevel.color }}
          >
            {memoryLevel.label}
          </span>
          <span className={`${currentSize.text} text-[#7F8C8D]`}>
            {memoryLevel.description}
          </span>
        </div>
      </div>

      {/* レベルバー */}
      <div className="flex items-center gap-1 mb-2">
        {Array.from({ length: maxLevel + 1 }).map((_, index) => (
          <div
            key={index}
            className={`flex-1 ${currentSize.barHeight} rounded-full transition-all duration-500`}
            style={{
              backgroundColor:
                index <= memoryLevel.level
                  ? memoryLevel.color
                  : "#E8E8E8",
              opacity: index <= memoryLevel.level ? 1 : 0.3,
            }}
          />
        ))}
      </div>

      {/* 次回復習日 */}
      {showNextReview && nextReviewDate && (
        <div className="flex items-center gap-1.5 mt-2">
          <Calendar className="w-3.5 h-3.5 text-[#7F8C8D]" />
          <span className="text-xs text-[#7F8C8D]">
            次回復習: {formatNextReview()}
          </span>
        </div>
      )}
    </div>
  );
}
