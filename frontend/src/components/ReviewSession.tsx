import { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Textarea } from "./ui/textarea";
import { motion, AnimatePresence } from "motion/react";
import { X, MessageCircleQuestion, Loader2, Eye, CheckCircle2, AlertCircle } from "lucide-react";
import { explainCard } from "../lib/api";
import { MarkdownText } from "./MarkdownText";

interface FlashCard {
  id: string;
  question: string;
  answer: string;
  lastReviewedDate?: string;
  nextReviewDate?: string;
  interval?: number;
  easeFactor?: number;
  reviewCount?: number;
  lapseCount?: number;
}

interface KnowledgeSource {
  id: string;
  name: string;
  content: string;
  type: "text" | "file";
}

interface ReviewSessionProps {
  deckName: string;
  knowledgeSources: KnowledgeSource[];
  cards: FlashCard[];
  onComplete: (results: ReviewResults) => void;
  onExit: (partialResults?: ReviewResults) => void;
}

interface ReviewResults {
  total: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
  cardReviews?: Array<{
    cardId: string;
    rating: Rating;
  }>;
}

type Rating = "again" | "hard" | "good" | "easy";

export function ReviewSession({ deckName, knowledgeSources, cards, onComplete, onExit }: ReviewSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showAskHelp, setShowAskHelp] = useState(false);
  const [userQuestion, setUserQuestion] = useState("");
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [results, setResults] = useState<ReviewResults>({
    total: 0,
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
    cardReviews: [],
  });
  // 最新の結果をrefで保持（setResultsの非同期性に対応）
  const latestResultsRef = useRef<ReviewResults>(results);

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex) / cards.length) * 100;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isLoadingAI || showAskHelp) return;

      if (!showAnswer && e.key === " ") {
        e.preventDefault();
        setShowAnswer(true);
      } else if (showAnswer) {
        if (e.key === "1") handleRating("again");
        if (e.key === "2") handleRating("hard");
        if (e.key === "3") handleRating("good");
        if (e.key === "4") handleRating("easy");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [showAnswer, showAskHelp, isLoadingAI]);

  const handleRating = (rating: Rating) => {
    const newResults: ReviewResults = {
      ...results,
      total: results.total + 1,
      [rating]: results[rating] + 1,
      cardReviews: [
        ...(results.cardReviews || []),
        { cardId: currentCard.id, rating }
      ],
    };

    setResults(newResults);
    latestResultsRef.current = newResults;

    // 「もう一度」か「難しい」の場合は質問オプションを表示
    if (rating === "again" || rating === "hard") {
      setShowAskHelp(true);
    } else {
      moveToNextCard(newResults);
    }
  };

  const handleAskQuestion = async () => {
    if (!userQuestion.trim()) return;

    setIsLoadingAI(true);
    setAiError(null);

    try {
      const knowledgeContext = knowledgeSources.length > 0
        ? knowledgeSources.map(s => `【${s.name}】\n${s.content}`).join('\n\n')
        : undefined;

      const response = await explainCard({
        cardQuestion: currentCard.question,
        cardAnswer: currentCard.answer,
        userQuestion: userQuestion.trim(),
        knowledgeContext,
      });

      setAiExplanation(response.explanation);
    } catch (error) {
      console.error('Failed to get explanation:', error);
      setAiError(error instanceof Error ? error.message : '解説の取得に失敗しました');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSkipHelp = () => {
    setShowAskHelp(false);
    setUserQuestion("");
    setAiExplanation(null);
    setAiError(null);
    moveToNextCard();
  };

  const handleContinueAfterHelp = () => {
    setShowAskHelp(false);
    setUserQuestion("");
    setAiExplanation(null);
    setAiError(null);
    moveToNextCard();
  };

  const moveToNextCard = (updatedResults?: ReviewResults) => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      // 最後のカードの場合、refから最新の結果を使用（非同期のsetResultsを待たない）
      onComplete(updatedResults || latestResultsRef.current);
    }
  };

  if (!currentCard || cards.length === 0) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] py-6 px-4">
        <div className="max-w-2xl mx-auto text-center pt-20">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#10B981]/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
          </div>
          <h2 className="text-xl text-[#2C3E50] mb-2">復習カードがありません</h2>
          <p className="text-[#7F8C8D] mb-6">現在復習が必要なカードはありません</p>
          <Button onClick={() => onExit()} className="bg-[#4A90E2] hover:bg-[#357ABD] text-white">
            戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-6 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#7F8C8D] mb-1 truncate">{deckName}</p>
            <div className="flex items-center gap-3">
              <span className="text-[#2C3E50]">
                {currentIndex + 1} / {cards.length}
              </span>
              <span className="text-xs text-[#7F8C8D]">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onExit(latestResultsRef.current.total > 0 ? latestResultsRef.current : undefined)}
            className="text-[#7F8C8D] hover:text-[#2C3E50] hover:bg-white/50"
          >
            <X className="w-5 h-5" />
          </Button>
        </motion.div>

        <Progress value={progress} className="mb-8 h-2" />

        {/* Card Display */}
        <AnimatePresence mode="wait">
          {!showAskHelp ? (
            <motion.div
              key={currentCard.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Question Card */}
              <Card className="min-h-[320px] sm:min-h-[360px] p-8 sm:p-10 bg-white border border-[#E5E7EB] shadow-md flex flex-col justify-center overflow-hidden">
                <div className="w-full">
                  <div className="inline-block px-3 py-1 bg-[#4A90E2]/10 text-[#4A90E2] text-xs rounded-full mb-6">
                    問題
                  </div>
                  <div className="text-lg sm:text-xl text-[#2C3E50] mb-8 leading-relaxed break-words">
                    <MarkdownText>{currentCard.question}</MarkdownText>
                  </div>

                  <AnimatePresence>
                    {showAnswer && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full pt-8 border-t border-[#E5E7EB]"
                      >
                        <div className="inline-block px-3 py-1 bg-[#10B981]/10 text-[#10B981] text-xs rounded-full mb-4">
                          答え
                        </div>
                        <div className="text-base sm:text-lg text-[#2C3E50] leading-relaxed break-words">
                          <MarkdownText>{currentCard.answer}</MarkdownText>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Card>

              {/* Action Buttons */}
              {!showAnswer ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Button
                    onClick={() => setShowAnswer(true)}
                    className="w-full h-14 sm:h-16 bg-[#4A90E2] hover:bg-[#357ABD] text-white shadow-lg text-base sm:text-lg"
                    size="lg"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    答えを表示
                    <span className="ml-3 text-sm opacity-70">(Space)</span>
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <p className="text-center text-sm text-[#7F8C8D] mb-2">
                    どのくらい思い出せましたか？
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    <Button
                      onClick={() => handleRating("again")}
                      variant="outline"
                      className="h-20 sm:h-24 bg-white border-2 border-[#E5E7EB] hover:border-[#FF6B6B] hover:bg-[#FF6B6B]/5 text-[#2C3E50] flex flex-col gap-1.5 transition-all"
                    >
                      <span className="text-sm sm:text-base">もう一度</span>
                      <span className="text-xs text-[#7F8C8D]">1日後</span>
                      <span className="text-xs text-[#95A5A6]">キー: 1</span>
                    </Button>
                    <Button
                      onClick={() => handleRating("hard")}
                      variant="outline"
                      className="h-20 sm:h-24 bg-white border-2 border-[#E5E7EB] hover:border-[#F59E0B] hover:bg-[#F59E0B]/5 text-[#2C3E50] flex flex-col gap-1.5 transition-all"
                    >
                      <span className="text-sm sm:text-base">難しい</span>
                      <span className="text-xs text-[#7F8C8D]">短い間隔</span>
                      <span className="text-xs text-[#95A5A6]">キー: 2</span>
                    </Button>
                    <Button
                      onClick={() => handleRating("good")}
                      variant="outline"
                      className="h-20 sm:h-24 bg-white border-2 border-[#E5E7EB] hover:border-[#10B981] hover:bg-[#10B981]/5 text-[#2C3E50] flex flex-col gap-1.5 transition-all"
                    >
                      <span className="text-sm sm:text-base">普通</span>
                      <span className="text-xs text-[#7F8C8D]">標準間隔</span>
                      <span className="text-xs text-[#95A5A6]">キー: 3</span>
                    </Button>
                    <Button
                      onClick={() => handleRating("easy")}
                      variant="outline"
                      className="h-20 sm:h-24 bg-white border-2 border-[#E5E7EB] hover:border-[#4A90E2] hover:bg-[#4A90E2]/5 text-[#2C3E50] flex flex-col gap-1.5 transition-all"
                    >
                      <span className="text-sm sm:text-base">簡単</span>
                      <span className="text-xs text-[#7F8C8D]">長い間隔</span>
                      <span className="text-xs text-[#95A5A6]">キー: 4</span>
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            // Ask for Help
            <motion.div
              key="ask-help"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-5"
            >
              {/* Show current card for reference */}
              <Card className="p-6 bg-[#F9FAFB] border border-[#E5E7EB] overflow-hidden">
                <div className="text-sm text-[#7F8C8D] mb-2">このカード:</div>
                <div className="text-[#2C3E50] mb-2 break-words">
                  <strong>Q:</strong> <MarkdownText className="inline">{currentCard.question}</MarkdownText>
                </div>
                <div className="text-[#2C3E50] break-words">
                  <strong>A:</strong> <MarkdownText className="inline">{currentCard.answer}</MarkdownText>
                </div>
              </Card>

              <Card className="p-8 bg-white border border-[#4A90E2]/20 shadow-lg">
                <div className="flex items-center gap-2 mb-6">
                  <div className="bg-[#4A90E2] p-2 rounded-lg">
                    <MessageCircleQuestion className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[#2C3E50]">AIに質問する</h3>
                    <p className="text-xs text-[#7F8C8D]">わからないことを聞いてください</p>
                  </div>
                </div>

                {aiError && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600">{aiError}</p>
                    </div>
                  </div>
                )}

                {!aiExplanation ? (
                  <div className="space-y-3">
                    <Textarea
                      value={userQuestion}
                      onChange={(e) => setUserQuestion(e.target.value)}
                      placeholder="例: なぜこうなるの？ もっと詳しく教えて、具体例が知りたい..."
                      className="min-h-[100px] resize-none text-base"
                      disabled={isLoadingAI}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleAskQuestion}
                        disabled={!userQuestion.trim() || isLoadingAI}
                        className="flex-1 bg-[#4A90E2] hover:bg-[#357ABD] text-white"
                      >
                        {isLoadingAI ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            解説中...
                          </>
                        ) : (
                          <>
                            <MessageCircleQuestion className="w-4 h-4 mr-2" />
                            質問する
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleSkipHelp}
                        variant="outline"
                        disabled={isLoadingAI}
                      >
                        スキップ
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-[#F3F4F6] rounded-lg border border-[#E5E7EB] overflow-hidden">
                      <p className="text-sm text-[#7F8C8D] mb-2">あなたの質問:</p>
                      <p className="text-[#2C3E50] break-words">{userQuestion}</p>
                    </div>
                    <div className="p-4 bg-[#4A90E2]/5 rounded-lg border border-[#4A90E2]/20 overflow-hidden">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-[#4A90E2]" />
                        <span className="text-sm font-medium text-[#4A90E2]">AIの解説</span>
                      </div>
                      <div className="text-[#2C3E50] break-words overflow-wrap-anywhere">
                        <MarkdownText>{aiExplanation}</MarkdownText>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setAiExplanation(null);
                          setUserQuestion("");
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        もう1つ質問
                      </Button>
                      <Button
                        onClick={handleContinueAfterHelp}
                        className="flex-1 bg-[#4A90E2] hover:bg-[#357ABD] text-white"
                      >
                        次のカードへ
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
