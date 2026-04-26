import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { CheckCircle, Home, RotateCcw, Trophy, Star, TrendingUp, BookOpen } from "lucide-react";
import { motion } from "motion/react";

interface SessionCompleteProps {
  deckName: string;
  results: {
    total: number;
    again: number;
    hard: number;
    good: number;
    easy: number;
    cardReviews?: Array<{
      cardId: string;
      rating: Rating;
    }>;
  };
  onReturnHome: () => void;
  onReviewAgain: () => void;
}

type Rating = "again" | "hard" | "good" | "easy";

export function SessionComplete({
  deckName,
  results,
  onReturnHome,
  onReviewAgain
}: SessionCompleteProps) {
  const accuracy = results.total > 0 
    ? Math.round(((results.good + results.easy) / results.total) * 100)
    : 0;

  const getMessage = () => {
    if (accuracy >= 90) return "完璧です！素晴らしい記憶力ですね！";
    if (accuracy >= 70) return "よくできました！着実に身についています。";
    if (accuracy >= 50) return "いい調子です！継続が大切です。";
    return "復習を続けましょう。少しずつ確実に！";
  };

  const getIcon = () => {
    if (accuracy >= 90) return <Trophy className="w-8 h-8 text-[#F59E0B] mx-auto mb-3" />;
    if (accuracy >= 70) return <Star className="w-8 h-8 text-[#50C878] mx-auto mb-3" />;
    if (accuracy >= 50) return <TrendingUp className="w-8 h-8 text-[#4A90E2] mx-auto mb-3" />;
    return <BookOpen className="w-8 h-8 text-[#7F8C8D] mx-auto mb-3" />;
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-8 px-4 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl w-full"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <div className="w-24 h-24 bg-[#10B981] rounded-full flex items-center justify-center shadow-lg">
            <CheckCircle className="w-14 h-14 text-white" />
          </div>
        </motion.div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[#2C3E50] mb-2">セッション完了</h1>
          <p className="text-[#7F8C8D]">{deckName}</p>
        </div>

        {/* Encouragement Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 bg-white border border-[#E5E7EB] shadow-sm mb-6 text-center">
            {getIcon()}
            <p className="text-[#2C3E50] font-medium">{getMessage()}</p>
          </Card>
        </motion.div>

        {/* Results Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 bg-white border border-[#E5E7EB] shadow-sm mb-6">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="text-center">
                <p className="text-4xl text-[#2C3E50] mb-1">{results.total}</p>
                <p className="text-sm text-[#7F8C8D]">復習カード</p>
              </div>
              <div className="text-center">
                <p className="text-4xl text-[#10B981] mb-1">{accuracy}%</p>
                <p className="text-sm text-[#7F8C8D]">正答率</p>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="space-y-3">
              {results.again > 0 && (
                <div className="flex items-center justify-between p-3 bg-[#FEF2F2] rounded-lg">
                  <span className="text-[#2C3E50]">思い出せなかった</span>
                  <span className="text-[#EF4444]">{results.again}枚</span>
                </div>
              )}
              {results.hard > 0 && (
                <div className="flex items-center justify-between p-3 bg-[#FFFBEB] rounded-lg">
                  <span className="text-[#2C3E50]">難しかった</span>
                  <span className="text-[#F59E0B]">{results.hard}枚</span>
                </div>
              )}
              {results.good > 0 && (
                <div className="flex items-center justify-between p-3 bg-[#ECFDF5] rounded-lg">
                  <span className="text-[#2C3E50]">思い出せた</span>
                  <span className="text-[#10B981]">{results.good}枚</span>
                </div>
              )}
              {results.easy > 0 && (
                <div className="flex items-center justify-between p-3 bg-[#EFF6FF] rounded-lg">
                  <span className="text-[#2C3E50]">完璧だった</span>
                  <span className="text-[#3B82F6]">{results.easy}枚</span>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Next Review Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-5 bg-white border border-[#E5E7EB] shadow-sm mb-6">
            <div className="text-center">
              <p className="text-sm text-[#7F8C8D] mb-1">次回の復習</p>
              <p className="text-[#2C3E50]">明日 15枚のカードが復習予定です</p>
            </div>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Button
            onClick={onReturnHome}
            variant="outline"
            className="flex-1 h-14 text-base bg-white hover:bg-[#F9FAFB] border-[#E5E7EB]"
          >
            <Home className="w-5 h-5 mr-2" />
            ホームへ
          </Button>
          {results.again > 0 && (
            <Button
              onClick={onReviewAgain}
              className="flex-1 h-14 bg-[#4A90E2] hover:bg-[#357ABD] text-white shadow-md text-base"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              もう一度復習
            </Button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
