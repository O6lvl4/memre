import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { MarkdownText } from "./MarkdownText";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Play,
  Search,
  MoreVertical,
  BookOpen,
  FileText,
  Sparkles,
  Calendar,
} from "lucide-react";
import { MemoryLevelMeter } from "./MemoryLevelMeter";
import { DeckLevelSummary } from "./DeckLevelSummary";
import { getMemoryLevel } from "../utils/spacedRepetition";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

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

interface DeckDetailProps {
  deckId: string;
  deckName: string;
  deckDescription?: string;
  deckRetentionRate?: number;
  knowledgeSources: KnowledgeSource[];
  cards: FlashCard[];
  onBack: () => void;
  onStartReview: () => void;
  onEditDeck: () => void;
  onDeleteDeck: () => void;
  onAddCard: () => void;
  onEditCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onStudySingleCard: (cardId: string) => void;
  onAddKnowledgeSource: () => void;
  onEditKnowledgeSource: (sourceId: string) => void;
  onDeleteKnowledgeSource: (sourceId: string) => void;
  onGenerateCards: () => void;
}

export function DeckDetail({
  deckId,
  deckName,
  deckDescription,
  deckRetentionRate,
  knowledgeSources,
  cards,
  onBack,
  onStartReview,
  onEditDeck,
  onDeleteDeck,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onStudySingleCard,
  onAddKnowledgeSource,
  onEditKnowledgeSource,
  onDeleteKnowledgeSource,
  onGenerateCards,
}: DeckDetailProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);

  const filteredCards = cards.filter(
    (card) =>
      card.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-[#7F8C8D] hover:text-[#2C3E50] hover:bg-white/50 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-[#2C3E50] truncate mb-1">{deckName}</h1>
              <p className="text-sm text-[#7F8C8D]">{cards.length}枚のカード</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={onStartReview}
              className="bg-[#4A90E2] hover:bg-[#357ABD] text-white shadow-md"
              disabled={cards.length === 0}
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              学習開始
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-9 w-9 flex items-center justify-center rounded-md border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] transition-colors"
                  aria-label="デッキメニュー"
                >
                  <MoreVertical className="w-4 h-4 text-[#7F8C8D]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEditDeck}>
                  <Edit className="w-4 h-4 mr-2" />
                  デッキを編集
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDeleteDeck}
                  className="text-[#FF6B6B]"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  デッキを削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Deck Level Summary */}
        <div className="mb-6">
          <DeckLevelSummary cards={cards} />
        </div>

        {/* Description */}
        {deckDescription && (
          <Card className="p-4 mb-6 bg-white border border-[#E5E7EB] shadow-sm">
            <p className="text-sm text-[#2C3E50] whitespace-pre-wrap">
              {deckDescription}
            </p>
          </Card>
        )}

        {/* Knowledge Sources */}
        {knowledgeSources.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#4A90E2]" />
                <h3 className="text-sm text-[#2C3E50]">
                  知識ソース ({knowledgeSources.length})
                </h3>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={onGenerateCards}
                  variant="outline"
                  size="sm"
                  className="bg-[#50C878]/5 text-[#50C878] border-[#50C878]/30 hover:bg-[#50C878]/10"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">カード生成</span>
                  <span className="sm:hidden">生成</span>
                </Button>
                <Button
                  onClick={onAddKnowledgeSource}
                  variant="outline"
                  size="sm"
                  className="text-[#4A90E2] border-[#4A90E2]/30 hover:bg-[#4A90E2]/10"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">追加</span>
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {knowledgeSources.map((source) => (
                <Card
                  key={source.id}
                  className="p-3 bg-white border border-[#4A90E2]/20 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-[#4A90E2] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() =>
                          setExpandedSourceId(
                            expandedSourceId === source.id ? null : source.id
                          )
                        }
                        className="w-full text-left"
                      >
                        <p className="text-sm text-[#2C3E50] mb-1">
                          {source.name}
                        </p>
                        <p className="text-xs text-[#7F8C8D]">
                          {source.content.length.toLocaleString()} 文字
                        </p>
                      </button>
                      {expandedSourceId === source.id && (
                        <div className="mt-3 pt-3 border-t border-[#4A90E2]/10">
                          <pre className="text-xs text-[#2C3E50] whitespace-pre-wrap font-mono max-h-[200px] overflow-y-auto">
                            {source.content}
                          </pre>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditKnowledgeSource(source.id)}
                        className="h-8 w-8 text-[#7F8C8D] hover:text-[#4A90E2]"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteKnowledgeSource(source.id)}
                        className="h-8 w-8 text-[#7F8C8D] hover:text-[#FF6B6B]"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {knowledgeSources.length === 0 && (
          <Card className="p-6 mb-6 bg-white border border-[#E5E7EB] shadow-sm text-center">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-[#7F8C8D]" />
            <p className="text-sm text-[#7F8C8D] mb-3">
              知識ソースを追加して、AIがより適切な問題を生成できるようにしましょう
            </p>
            <Button
              onClick={onAddKnowledgeSource}
              variant="outline"
              size="sm"
              className="text-[#4A90E2] border-[#4A90E2]"
            >
              <Plus className="w-4 h-4 mr-2" />
              最初の知識ソースを追加
            </Button>
          </Card>
        )}

        {/* Search and Add */}
        <div className="flex gap-3 mb-6 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7F8C8D]" />
            <Input
              placeholder="カードを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-white border-[#E5E7EB]"
            />
          </div>
          <Button
            onClick={onAddCard}
            className="bg-[#10B981] hover:bg-[#059669] text-white shadow-md w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            カード追加
          </Button>
        </div>

        {/* Cards List */}
        {filteredCards.length === 0 ? (
          <Card className="p-12 bg-white border border-[#E5E7EB] shadow-sm text-center">
            <div className="text-[#7F8C8D]">
              {cards.length === 0 ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 bg-[#4A90E2]/10 rounded-full flex items-center justify-center">
                    <Plus className="w-8 h-8 text-[#4A90E2]" />
                  </div>
                  <p className="text-[#2C3E50] mb-2">まだカードがありません</p>
                  <p className="text-sm text-[#7F8C8D] mb-6">最初のカードを作成して学習を始めましょう</p>
                  <Button
                    onClick={onAddCard}
                    className="bg-[#4A90E2] hover:bg-[#357ABD] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    最初のカードを作成
                  </Button>
                </>
              ) : (
                <p>検索結果が見つかりません</p>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredCards.map((card, index) => {
              const memoryLevel = getMemoryLevel(card.interval, card.lastReviewedDate);
              
              return (
                <Card
                  key={card.id}
                  className="p-5 bg-white border border-[#E5E7EB] shadow-sm hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-[#4A90E2]/10 rounded-xl flex items-center justify-center text-sm text-[#4A90E2]">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* メモリーレベルと復習情報 */}
                      <div className="flex items-center gap-2 mb-3">
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{
                            borderColor: memoryLevel.color,
                            color: memoryLevel.color,
                          }}
                        >
                          {memoryLevel.label}
                        </Badge>
                        {card.lastReviewedDate && (
                          <span className="text-xs text-[#7F8C8D] flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            最終: {new Date(card.lastReviewedDate).toLocaleDateString('ja-JP', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        )}
                        {card.reviewCount !== undefined && card.reviewCount > 0 && (
                          <span className="text-xs text-[#7F8C8D]">
                            {card.reviewCount}回復習
                          </span>
                        )}
                      </div>

                      <div className="mb-2">
                        <p className="text-sm text-[#7F8C8D] mb-1">問題</p>
                        <div className="text-[#2C3E50]">
                          <MarkdownText>{card.question}</MarkdownText>
                        </div>
                      </div>
                      <div className="mb-3">
                        <p className="text-sm text-[#7F8C8D] mb-1">答え</p>
                        <div className="text-[#2C3E50]">
                          <MarkdownText>{card.answer}</MarkdownText>
                        </div>
                      </div>

                      {/* 記憶レベルメーター */}
                      <MemoryLevelMeter 
                        interval={card.interval}
                        lastReviewedDate={card.lastReviewedDate}
                        nextReviewDate={card.nextReviewDate}
                        size="sm"
                        showNextReview={true}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onStudySingleCard(card.id)}
                        className="text-[#7F8C8D] hover:text-[#10B981]"
                        title="このカードを学習"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditCard(card.id)}
                        className="text-[#7F8C8D] hover:text-[#4A90E2]"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteCardId(card.id)}
                        className="text-[#7F8C8D] hover:text-[#FF6B6B]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteCardId !== null}
        onOpenChange={(open) => !open && setDeleteCardId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>カードを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。カードは完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteCardId) {
                  onDeleteCard(deleteCardId);
                  setDeleteCardId(null);
                }
              }}
              className="bg-[#FF6B6B] hover:bg-[#FF5252]"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
