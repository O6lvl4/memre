import { Progress } from "./ui/progress";
import { Activity } from "lucide-react";

interface RetentionMeterProps {
  retentionRate: number; // 0-100
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showIcon?: boolean;
}

export function RetentionMeter({
  retentionRate,
  size = "md",
  showLabel = true,
  showIcon = true,
}: RetentionMeterProps) {
  // 定着率に応じた色を決定
  const getColor = (rate: number): string => {
    if (rate >= 80) return "#50C878"; // 緑：良好
    if (rate >= 60) return "#FFD93D"; // 黄：注意
    if (rate >= 40) return "#FF9A3D"; // オレンジ：警告
    return "#FF6B6B"; // 赤：要復習
  };

  // 定着率に応じたラベル
  const getLabel = (rate: number): string => {
    if (rate >= 80) return "良好";
    if (rate >= 60) return "注意";
    if (rate >= 40) return "警告";
    if (rate > 0) return "要復習";
    return "未学習";
  };

  const color = getColor(retentionRate);
  const label = getLabel(retentionRate);

  const heights = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            {showIcon && <Activity className="w-3.5 h-3.5" style={{ color }} />}
            <span className={`${textSizes[size]} text-[#7F8C8D]`}>定着率</span>
          </div>
          <span className={`${textSizes[size]}`} style={{ color }}>
            {retentionRate}% {label}
          </span>
        </div>
      )}
      <div className={`${heights[size]} bg-[#E8E8E8] rounded-full overflow-hidden`}>
        <div
          className="h-full transition-all duration-500 ease-out rounded-full"
          style={{
            width: `${retentionRate}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
