import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AlertTriangle, Clock, TrendingUp, Flame } from "lucide-react";
import { calculateDeckPriority } from "../utils/spacedRepetition";

interface FlashCard {
  id: string;
  question: string;
  answer: string;
  lastReviewedDate?: string;
  nextReviewDate?: string;
  interval?: number;
}

interface Deck {
  id: string;
  name: string;
  dueCount: number;
  newCount: number;
  totalCards: number;
  color: string;
}

interface ReviewRecommendationsProps {
  decks: Deck[];
  cards: Record<string, FlashCard[]>;
  onStartReview: (deckId: string) => void;
}

export function ReviewRecommendations({
  decks,
  cards,
  onStartReview,
}: ReviewRecommendationsProps) {
  // 各デッキの優先度を計算
  const deckPriorities = decks
    .map((deck) => {
      const deckCards = cards[deck.id] || [];
      const priority = calculateDeckPriority(deckCards);
      return {
        deck,
        ...priority,
      };
    })
    .filter((item) => item.overdueCount > 0 || item.dueCount > 0 || item.upcomingCount > 0)
    .sort((a, b) => b.priority - a.priority);

  const totalOverdue = deckPriorities.reduce((sum, item) => sum + item.overdueCount, 0);
  const totalDue = deckPriorities.reduce((sum, item) => sum + item.dueCount, 0);
  const totalUpcoming = deckPriorities.reduce((sum, item) => sum + item.upcomingCount, 0);

  // 復習推奨がない場合でもカードがあれば復習可能
  if (deckPriorities.length === 0) {
    const hasCards = decks.some((deck) => (cards[deck.id] || []).length > 0);
    return (
      <Card className="p-6 bg-gradient-to-br from-[#50C878]/10 to-[#4A90E2]/10 border-none shadow-sm">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-[#50C878]" />
          <h3 className="text-[#2C3E50] mb-2">すべてのカードが最新の状態です！</h3>
          <p className="text-sm text-[#7F8C8D] mb-3">
            現在復習が急がれるカードはありません。
          </p>
          {hasCards && (
            <p className="text-xs text-[#7F8C8D]">
              復習したい場合は、デッキを選択して「学習開始」を押してください。
            </p>
          )}
        </div>
      </Card>
    );
  }

  // 復習期限切れがなく、近日中のカードのみの場合
  if (totalOverdue === 0 && totalDue === 0 && totalUpcoming > 0) {
    return (
      <Card className="p-6 bg-gradient-to-br from-[#4A90E2]/10 to-[#50C878]/10 border-none shadow-sm">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto mb-3 text-[#4A90E2]" />
          <h3 className="text-[#2C3E50] mb-2">今日の必須復習は完了！</h3>
          <p className="text-sm text-[#7F8C8D] mb-1">
            2日以内に{totalUpcoming}枚のカードが復習予定です。
          </p>
          <p className="text-xs text-[#7F8C8D]">
            もっと復習したい場合は、デッキを選択して「学習開始」を押せます。
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* サマリー統計 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {totalOverdue > 0 && (
          <Card className="p-5 bg-gradient-to-br from-[#FF6B6B]/10 to-[#FF6B6B]/5 border-l-4 border-[#FF6B6B] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-[#FF6B6B]" />
              <span className="text-xs text-[#7F8C8D]">遅延中</span>
            </div>
            <div className="text-3xl text-[#FF6B6B] mb-1">{totalOverdue}</div>
            <div className="text-xs text-[#7F8C8D]">今すぐ復習を</div>
          </Card>
        )}
        
        {totalDue > 0 && (
          <Card className="p-5 bg-gradient-to-br from-[#FFD93D]/10 to-[#FFD93D]/5 border-l-4 border-[#FFD93D] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-[#E8B923]" />
              <span className="text-xs text-[#7F8C8D]">今日</span>
            </div>
            <div className="text-3xl text-[#E8B923] mb-1">{totalDue}</div>
            <div className="text-xs text-[#7F8C8D]">定着のチャンス</div>
          </Card>
        )}
        
        {totalUpcoming > 0 && (
          <Card className="p-5 bg-gradient-to-br from-[#4A90E2]/10 to-[#4A90E2]/5 border-l-4 border-[#4A90E2] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#4A90E2]" />
              <span className="text-xs text-[#7F8C8D]">近日予定</span>
            </div>
            <div className="text-3xl text-[#4A90E2] mb-1">{totalUpcoming}</div>
            <div className="text-xs text-[#7F8C8D]">2日以内に復習</div>
          </Card>
        )}
      </div>

      {/* 優先デッキリスト */}
      <Card className="p-5 bg-white border-none shadow-sm">
        <h3 className="text-sm text-[#2C3E50] mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#4A90E2]" />
          学習すべきデッキ
        </h3>
        <div className="space-y-3">
          {deckPriorities.slice(0, 5).map((item) => (
              <div
                key={item.deck.id}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-[#F8F9FA] to-transparent rounded-xl hover:from-[#F0F1F2] hover:shadow-sm transition-all"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.deck.color }}
                    />
                    <span className="text-sm text-[#2C3E50]">{item.deck.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.overdueCount > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs border-[#FF6B6B] text-[#FF6B6B]"
                      >
                        遅延 {item.overdueCount}
                      </Badge>
                    )}
                    {item.dueCount > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs border-[#FFD93D] text-[#E8B923]"
                      >
                        今日 {item.dueCount}
                      </Badge>
                    )}
                    {item.upcomingCount > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs border-[#4A90E2] text-[#4A90E2]"
                      >
                        近日 {item.upcomingCount}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onStartReview(item.deck.id)}
                  className="bg-gradient-to-r from-[#4A90E2] to-[#357ABD] hover:from-[#357ABD] hover:to-[#2868A8] text-white shadow-sm"
                >
                  学習
                </Button>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}
