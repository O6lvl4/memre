import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { BookOpen, Plus, ChevronRight, Calendar, AlertCircle, Sparkles, BarChart2, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

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
  retentionRate?: number;
}

interface HomeProps {
  decks: Deck[];
  cards: Record<string, FlashCard[]>;
  onStartReview: (deckId: string) => void;
  onCreateDeck: () => void;
  onViewDeck: (deckId: string) => void;
  onStartCrossDeckReview: () => void;
  onStartCrossDeckNew: () => void;
  onViewCrossDeckMastered: () => void;
}

export function Home({ decks, cards, onStartReview, onCreateDeck, onViewDeck, onStartCrossDeckReview, onStartCrossDeckNew, onViewCrossDeckMastered }: HomeProps) {
  // 統計情報の計算
  const totalDue = decks.reduce((sum, deck) => sum + deck.dueCount, 0);
  const totalNew = decks.reduce((sum, deck) => sum + deck.newCount, 0);
  const totalReviewed = decks.reduce((sum, deck) => sum + (deck.totalCards - deck.dueCount - deck.newCount), 0);
  
  // 遅延カード（本日のdue + 過去の分）の計算
  const getOverdueCount = (deck: Deck): number => {
    const deckCards = cards[deck.id] || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return deckCards.filter(card => {
      if (!card.nextReviewDate) return false;
      const nextReview = new Date(card.nextReviewDate);
      nextReview.setHours(0, 0, 0, 0);
      return nextReview < today;
    }).length;
  };
  
  return (
    <div className="min-h-screen bg-[#F9FAFB]" style={{ padding: 'var(--space-md)' }}>
      <div className="max-w-4xl mx-auto">
        {/* 今日の学習サマリー */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ marginBottom: 'var(--space-lg)' }}
        >
          <h2
            className="text-[var(--color-text-primary)] mb-4 flex items-center gap-2"
            style={{ fontSize: 'var(--text-lg)', fontWeight: '600' }}
          >
            <BarChart2 className="w-5 h-5 text-[var(--color-primary)]" />
            今日の学習サマリー
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 復習カード */}
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card
                className={`bg-white border-none overflow-hidden ${totalDue > 0 ? 'cursor-pointer' : ''}`}
                onClick={totalDue > 0 ? onStartCrossDeckReview : undefined}
                style={{
                  boxShadow: 'var(--shadow-sm)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-md)',
                  borderLeft: '4px solid var(--color-danger)',
                  borderTop: '1px solid #F3F4F6',
                  borderRight: '1px solid #F3F4F6',
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-[var(--color-danger)]" />
                  <span
                    className="text-[var(--color-text-secondary)]"
                    style={{ fontSize: 'var(--text-xs)', fontWeight: '500' }}
                  >
                    復習
                  </span>
                  {totalDue > 0 && (
                    <ChevronRight className="w-3 h-3 text-[var(--color-text-tertiary)] ml-auto" />
                  )}
                </div>
                <div
                  className="text-[var(--color-danger)] mb-1"
                  style={{ fontSize: 'var(--text-4xl)', fontWeight: 'bold', lineHeight: 1 }}
                >
                  {totalDue}
                </div>
                <div
                  className="text-[var(--color-text-tertiary)]"
                  style={{ fontSize: 'var(--text-xs)' }}
                >
                  今日の復習枚数
                </div>
              </Card>
            </motion.div>
            
            {/* 新規学習 */}
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card
                className={`bg-white border-none overflow-hidden ${totalNew > 0 ? 'cursor-pointer' : ''}`}
                onClick={totalNew > 0 ? onStartCrossDeckNew : undefined}
                style={{
                  boxShadow: 'var(--shadow-sm)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-md)',
                  borderLeft: '4px solid var(--color-info)',
                  borderTop: '1px solid #F3F4F6',
                  borderRight: '1px solid #F3F4F6',
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-info)]" />
                  <span
                    className="text-[var(--color-text-secondary)]"
                    style={{ fontSize: 'var(--text-xs)', fontWeight: '500' }}
                  >
                    新規学習
                  </span>
                  {totalNew > 0 && (
                    <ChevronRight className="w-3 h-3 text-[var(--color-text-tertiary)] ml-auto" />
                  )}
                </div>
                <div
                  className="text-[var(--color-info)] mb-1"
                  style={{ fontSize: 'var(--text-4xl)', fontWeight: 'bold', lineHeight: 1 }}
                >
                  {totalNew}
                </div>
                <div
                  className="text-[var(--color-text-tertiary)]"
                  style={{ fontSize: 'var(--text-xs)' }}
                >
                  未学習カード
                </div>
              </Card>
            </motion.div>
            
            {/* 定着済み */}
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card
                className={`bg-white border-none overflow-hidden ${totalReviewed > 0 ? 'cursor-pointer' : ''}`}
                onClick={totalReviewed > 0 ? onViewCrossDeckMastered : undefined}
                style={{
                  boxShadow: 'var(--shadow-sm)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-md)',
                  borderLeft: '4px solid var(--color-success)',
                  borderTop: '1px solid #F3F4F6',
                  borderRight: '1px solid #F3F4F6',
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
                  <span
                    className="text-[var(--color-text-secondary)]"
                    style={{ fontSize: 'var(--text-xs)', fontWeight: '500' }}
                  >
                    定着済み
                  </span>
                  {totalReviewed > 0 && (
                    <ChevronRight className="w-3 h-3 text-[var(--color-text-tertiary)] ml-auto" />
                  )}
                </div>
                <div
                  className="text-[var(--color-success)] mb-1"
                  style={{ fontSize: 'var(--text-4xl)', fontWeight: 'bold', lineHeight: 1 }}
                >
                  {totalReviewed}
                </div>
                <div
                  className="text-[var(--color-text-tertiary)]"
                  style={{ fontSize: 'var(--text-xs)' }}
                >
                  復習不要
                </div>
              </Card>
            </motion.div>
          </div>
        </motion.section>

        {/* Decks Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div 
            className="flex items-center justify-between"
            style={{ marginBottom: 'var(--space-md)' }}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 
                className="text-[var(--color-text-primary)]"
                style={{ fontSize: 'var(--text-xl)', fontWeight: '600' }}
              >
                デッキ
              </h2>
              <span 
                className="text-[var(--color-text-tertiary)]"
                style={{ fontSize: 'var(--text-sm)' }}
              >
                ({decks.length})
              </span>
            </div>
            <Button
              onClick={onCreateDeck}
              className="bg-[#10B981] hover:bg-[#059669] text-white transition-all shadow-sm"
              style={{ 
                height: 'var(--space-xl)',
                borderRadius: 'var(--radius-sm)',
              }}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              新規作成
            </Button>
          </div>
          
          {decks.length === 0 ? (
            <Card 
              className="bg-white border border-[#E5E7EB] text-center"
              style={{ 
                padding: 'var(--space-2xl)',
                boxShadow: 'var(--shadow-sm)',
                borderRadius: 'var(--radius-lg)'
              }}
            >
              <div className="max-w-sm mx-auto">
                <div 
                  className="mx-auto mb-4 bg-[#4A90E2]/10 rounded-full flex items-center justify-center"
                  style={{ width: '80px', height: '80px' }}
                >
                  <BookOpen className="w-10 h-10 text-[var(--color-primary)]" />
                </div>
                <h3 
                  className="text-[var(--color-text-primary)] mb-2"
                  style={{ fontSize: 'var(--text-lg)', fontWeight: '600' }}
                >
                  最初のデッキを作成しましょう
                </h3>
                <p 
                  className="text-[var(--color-text-secondary)] mb-6"
                  style={{ fontSize: 'var(--text-sm)' }}
                >
                  学習したいテーマを決めて、カードを追加してください
                </p>
                <Button
                  onClick={onCreateDeck}
                  className="bg-[#4A90E2] hover:bg-[#357ABD] text-white transition-all shadow-md"
                  style={{ 
                    height: 'var(--space-xl)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  デッキを作成
                </Button>
              </div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {decks.map((deck, index) => {
                const progress = deck.totalCards > 0 
                  ? ((deck.totalCards - deck.dueCount - deck.newCount) / deck.totalCards) * 100 
                  : 0;
                const overdueCount = getOverdueCount(deck);
                
                return (
                  <motion.div
                    key={deck.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    whileHover={{ y: -2 }}
                  >
                    <Card 
                      className="bg-white border border-[#F3F4F6] hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                      onClick={() => onViewDeck(deck.id)}
                      style={{ 
                        boxShadow: 'var(--shadow-sm)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-md)',
                        borderLeft: deck.totalCards === 0
                          ? '4px solid var(--color-text-tertiary)'
                          : overdueCount > 0 
                          ? '4px solid var(--color-danger)' 
                          : deck.dueCount > 0 
                          ? '4px solid var(--color-warning)' 
                          : '4px solid var(--color-success)'
                      }}
                    >
                      <div className="space-y-4">
                        {/* Header: Deck Name + Action */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-3">
                              <h3 
                                className="text-[var(--color-text-primary)] truncate"
                                style={{ fontSize: 'var(--text-lg)', fontWeight: '600' }}
                              >
                                {deck.name}
                              </h3>
                              <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </div>
                            
                            {/* Progress Bar - Integrated within card */}
                            <div className="mb-3">
                              <Progress 
                                value={progress} 
                                className="h-2 bg-[var(--color-bg-muted)]"
                                style={{ borderRadius: 'var(--radius-full)' }}
                              />
                              <div 
                                className="flex justify-between mt-1"
                                style={{ fontSize: 'var(--text-xs)' }}
                              >
                                <span className="text-[var(--color-text-tertiary)]">進捗</span>
                                <span 
                                  className="text-[var(--color-text-secondary)]"
                                  style={{ fontWeight: '600' }}
                                >
                                  {deck.totalCards === 0 
                                    ? '0枚' 
                                    : `${Math.round(progress)}% (${deck.totalCards - deck.dueCount - deck.newCount} / ${deck.totalCards}枚)`
                                  }
                                </span>
                              </div>
                            </div>
                            
                            {/* Meta Information - Icons with labels */}
                            <div className="flex flex-wrap gap-2">
                              {deck.totalCards === 0 ? (
                                <div 
                                  className="flex items-center gap-1.5 bg-[#F3F4F6] px-3 py-1"
                                  style={{ borderRadius: 'var(--radius-full)' }}
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                                  <span 
                                    className="text-[var(--color-text-tertiary)]"
                                    style={{ fontSize: 'var(--text-xs)', fontWeight: '600' }}
                                  >
                                    カードがありません
                                  </span>
                                </div>
                              ) : (
                                <>
                                  {overdueCount > 0 && (
                                    <div 
                                      className="flex items-center gap-1.5 bg-[#FEE2E2] px-3 py-1"
                                      style={{ borderRadius: 'var(--radius-full)' }}
                                    >
                                      <AlertCircle className="w-3.5 h-3.5 text-[var(--color-danger)]" />
                                      <span 
                                        className="text-[var(--color-danger)]"
                                        style={{ fontSize: 'var(--text-xs)', fontWeight: '600' }}
                                      >
                                        遅延{overdueCount}
                                      </span>
                                    </div>
                                  )}
                                  {deck.dueCount > 0 && (
                                    <div 
                                      className="flex items-center gap-1.5 bg-[#FEF3C7] px-3 py-1"
                                      style={{ borderRadius: 'var(--radius-full)' }}
                                    >
                                      <Calendar className="w-3.5 h-3.5 text-[var(--color-warning)]" />
                                      <span 
                                        className="text-[var(--color-warning)]"
                                        style={{ fontSize: 'var(--text-xs)', fontWeight: '600' }}
                                      >
                                        今日{deck.dueCount}
                                      </span>
                                    </div>
                                  )}
                                  {deck.newCount > 0 && (
                                    <div 
                                      className="flex items-center gap-1.5 bg-[#DBEAFE] px-3 py-1"
                                      style={{ borderRadius: 'var(--radius-full)' }}
                                    >
                                      <Sparkles className="w-3.5 h-3.5 text-[var(--color-info)]" />
                                      <span 
                                        className="text-[var(--color-info)]"
                                        style={{ fontSize: 'var(--text-xs)', fontWeight: '600' }}
                                      >
                                        新規{deck.newCount}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Main Action Button - 常に表示 */}
                          {deck.totalCards > 0 ? (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartReview(deck.id);
                              }}
                              className="bg-[#4A90E2] hover:bg-[#357ABD] text-white transition-all active:scale-95 shadow-md"
                              style={{ 
                                height: 'var(--space-xl)',
                                borderRadius: 'var(--radius-sm)',
                                minWidth: '120px',
                                fontSize: 'var(--text-sm)',
                                fontWeight: '600'
                              }}
                            >
                              学習開始 ▶
                            </Button>
                          ) : (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewDeck(deck.id);
                              }}
                              className="bg-[#10B981] hover:bg-[#059669] text-white transition-all active:scale-95 shadow-md"
                              style={{ 
                                height: 'var(--space-xl)',
                                borderRadius: 'var(--radius-sm)',
                                minWidth: '120px',
                                fontSize: 'var(--text-sm)',
                                fontWeight: '600'
                              }}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              カードを追加
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}
