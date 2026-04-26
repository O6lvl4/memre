import { Progress } from "./ui/progress";
import { Flame, Repeat, Brain, Gem, Library } from "lucide-react";
import {
  RARITY_COLORS,
  CATEGORY_CONFIG,
  getCurrentTitle,
  getNextAchievements,
  type UserStats,
  type IconName
} from "../utils/achievements";

interface AchievementDisplayProps {
  stats: UserStats;
}

// アイコンコンポーネントのマッピング
const IconMap: Record<IconName, typeof Flame> = {
  flame: Flame,
  repeat: Repeat,
  brain: Brain,
  gem: Gem,
  library: Library,
};

export function AchievementDisplay({ stats }: AchievementDisplayProps) {
  const currentTitle = getCurrentTitle(stats);
  const nextAchievements = getNextAchievements(stats, 2);

  if (!currentTitle && nextAchievements.length === 0) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#E5E7EB] shadow-sm"
      style={{ marginBottom: 'var(--space-md)' }}
    >
      {/* 現在の称号 */}
      {currentTitle && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full shrink-0"
          style={{
            backgroundColor: RARITY_COLORS[currentTitle.rarity].bg,
            border: `1px solid ${RARITY_COLORS[currentTitle.rarity].border}`,
          }}
        >
          {(() => {
            const Icon = IconMap[currentTitle.icon as IconName];
            return Icon ? <Icon className="w-4 h-4" style={{ color: RARITY_COLORS[currentTitle.rarity].text }} /> : null;
          })()}
          <span
            className="text-sm font-medium"
            style={{ color: RARITY_COLORS[currentTitle.rarity].text }}
          >
            {currentTitle.name}
          </span>
        </div>
      )}

      {/* 次の目標（コンパクト表示） */}
      {nextAchievements.length > 0 && (
        <div className="flex-1 flex items-center gap-4 min-w-0">
          {nextAchievements.map((achievement) => {
            const progress = (achievement.currentValue / achievement.requirement) * 100;
            const colors = RARITY_COLORS[achievement.title.rarity];
            const Icon = IconMap[achievement.title.icon as IconName];
            const categoryKey = achievement.id.split('_')[0];
            const label = CATEGORY_CONFIG[categoryKey]?.label || '';

            return (
              <div key={achievement.id} className="flex items-center gap-2 flex-1 min-w-0">
                {Icon && <Icon className="w-3.5 h-3.5 text-[#7F8C8D] shrink-0" />}
                <span className="text-xs text-[#7F8C8D] shrink-0 w-8">{label}</span>
                <div className="flex-1 min-w-0">
                  <Progress
                    value={progress}
                    className="h-1.5"
                    style={{ backgroundColor: `${colors.border}40` }}
                  />
                </div>
                <span className="text-xs text-[#7F8C8D] shrink-0 tabular-nums">
                  {achievement.currentValue}/{achievement.requirement}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
