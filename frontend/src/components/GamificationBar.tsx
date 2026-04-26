import { Flame, Zap } from "lucide-react";
import { getXPState, type XPState } from "../utils/gamification";
import { useEffect, useState } from "react";

interface GamificationBarProps {
  streak: number;
  onRefresh?: () => void;
}

export function GamificationBar({ streak, onRefresh }: GamificationBarProps) {
  const [xpState, setXPState] = useState<XPState | null>(null);

  useEffect(() => {
    setXPState(getXPState());
  }, [onRefresh]);

  if (!xpState) return null;

  const dailyComplete = xpState.todayXP >= xpState.dailyGoal;

  return (
    <div
      className="flex items-center justify-between gap-2 px-3 py-2 bg-white rounded-lg border border-[#E5E7EB] shadow-sm"
      style={{ marginBottom: 'var(--space-md)' }}
    >
      {/* レベル */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4A90E2] to-[#357ABD] flex items-center justify-center text-white text-xs font-bold">
          {xpState.level}
        </div>
        <div className="text-xs text-[#2C3E50] font-medium">{xpState.levelName}</div>
      </div>

      {/* 今日のXP */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${dailyComplete ? 'bg-[#D1FAE5]' : 'bg-[#F3F4F6]'}`}>
        <Zap className={`w-3.5 h-3.5 ${dailyComplete ? 'text-[#10B981]' : 'text-[#F59E0B]'}`} />
        <span className={`text-xs font-medium tabular-nums ${dailyComplete ? 'text-[#10B981]' : 'text-[#2C3E50]'}`}>
          {xpState.todayXP} XP
        </span>
      </div>

      {/* ストリーク */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${streak > 0 ? 'bg-[#FEF3C7]' : 'bg-[#F3F4F6]'}`}>
        <Flame className={`w-3.5 h-3.5 ${streak > 0 ? 'text-[#F59E0B]' : 'text-[#D1D5DB]'}`} />
        <span className={`text-xs font-medium tabular-nums ${streak > 0 ? 'text-[#D97706]' : 'text-[#9CA3AF]'}`}>
          {streak}日
        </span>
      </div>
    </div>
  );
}
