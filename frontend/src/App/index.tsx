/**
 * Main App component
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Home } from "../components/Home";
import { DeckDetail } from "../components/DeckDetail";
import { ReviewSession } from "../components/ReviewSession";
import { SessionComplete } from "../components/SessionComplete";
import { DeckDialog } from "../components/DeckDialog";
import { CardDialog } from "../components/CardDialog";
import { KnowledgeSourceDialog } from "../components/KnowledgeSourceDialog";
import { GenerateCardsDialog } from "../components/GenerateCardsDialog";
import { Toaster } from "../components/ui/sonner";
import { toast } from "sonner";
import { calculateDeckRetentionRate, isDue } from "../utils/spacedRepetition";
import { useAuth } from "../contexts/AuthContext";
import { dataStore, timestamp } from "../lib/dataStore";
import type { FlashCard as StoredFlashCard, KnowledgeSource as StoredKnowledgeSource } from "../lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

import type { Deck, FlashCard, KnowledgeSource, ReviewResults, Screen } from "./types";
import { toUIDeck, toStoredDeck } from "./types";
import { useDeckOperations } from "./useDeckOperations";
import { useCardOperations } from "./useCardOperations";
import { useKnowledgeSourceOperations } from "./useKnowledgeSourceOperations";
import { useReviewSession } from "./useReviewSession";

export default function App() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Record<string, FlashCard[]>>({});
  const [knowledgeSources, setKnowledgeSources] = useState<Record<string, KnowledgeSource[]>>({});
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [sessionResults, setSessionResults] = useState<ReviewResults | null>(null);
  const [singleStudyCardId, setSingleStudyCardId] = useState<string | null>(null);
  const [crossDeckMode, setCrossDeckMode] = useState<"review" | "new" | null>(null);

  // Track if initial load has been done
  const hasLoadedRef = useRef(false);
  // Track if we should save (skip initial load)
  const shouldSaveRef = useRef(false);

  // Dialog states
  const [deckDialogOpen, setDeckDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [knowledgeSourceDialogOpen, setKnowledgeSourceDialogOpen] = useState(false);
  const [generateCardsDialogOpen, setGenerateCardsDialogOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [editingCard, setEditingCard] = useState<FlashCard | null>(null);
  const [editingKnowledgeSource, setEditingKnowledgeSource] = useState<KnowledgeSource | null>(null);
  const [deleteDeckId, setDeleteDeckId] = useState<string | null>(null);

  const selectedDeck = selectedDeckId ? decks.find((d) => d.id === selectedDeckId) ?? null : null;

  // Load data from storage
  useEffect(() => {
    async function loadData() {
      if (!user?.id || hasLoadedRef.current) return;

      try {
        const data = await dataStore.exportAllData(user.id);

        // Convert stored cards to include deckId mapping
        const cardsWithDeckId: Record<string, FlashCard[]> = {};
        for (const [deckId, deckCards] of Object.entries(data.cards)) {
          cardsWithDeckId[deckId] = deckCards.map(c => ({ ...c, deckId }));
        }

        // Convert stored sources to include deckId mapping
        const sourcesWithDeckId: Record<string, KnowledgeSource[]> = {};
        for (const [deckId, deckSources] of Object.entries(data.knowledgeSources)) {
          sourcesWithDeckId[deckId] = deckSources.map(s => ({ ...s, deckId }));
        }

        setCards(cardsWithDeckId);
        setKnowledgeSources(sourcesWithDeckId);

        // Convert stored decks to UI decks with computed fields
        const uiDecks = data.decks.map(deck =>
          toUIDeck(deck, cardsWithDeckId[deck.id] || [])
        );
        setDecks(uiDecks);

        hasLoadedRef.current = true;
        // Enable saving after load is complete
        setTimeout(() => {
          shouldSaveRef.current = true;
        }, 100);
      } catch (error) {
        console.error('Failed to load data:', error);
        toast.error('データの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user?.id]);

  // Save decks to storage when they change
  const saveDecks = useCallback(async (decksToSave: Deck[]) => {
    if (!user?.id || !shouldSaveRef.current) return;

    try {
      for (const deck of decksToSave) {
        await dataStore.saveDeck(user.id, toStoredDeck(deck));
      }
    } catch (error) {
      console.error('Failed to save decks:', error);
      toast.error("デッキの保存に失敗しました: " + (error as any)?.message);
    }
  }, [user?.id]);

  // Save cards to storage when they change
  const saveCards = useCallback(async (cardsToSave: Record<string, FlashCard[]>) => {
    if (!user?.id || !shouldSaveRef.current) return;

    try {
      const allCards: StoredFlashCard[] = [];
      for (const [deckId, deckCards] of Object.entries(cardsToSave)) {
        for (const card of deckCards) {
          allCards.push({
            ...card,
            deckId,
            createdAt: card.createdAt || timestamp(),
            updatedAt: timestamp(),
          } as StoredFlashCard);
        }
      }
      if (allCards.length > 0) {
        await dataStore.saveCards(user.id, allCards);
      }
    } catch (error) {
      console.error('Failed to save cards:', error);
      toast.error("カードの保存に失敗しました: " + (error as any)?.message);
    }
  }, [user?.id]);

  // Save knowledge sources to storage when they change
  const saveKnowledgeSources = useCallback(async (sourcesToSave: Record<string, KnowledgeSource[]>) => {
    if (!user?.id || !shouldSaveRef.current) return;

    try {
      for (const [deckId, deckSources] of Object.entries(sourcesToSave)) {
        for (const source of deckSources) {
          await dataStore.saveKnowledgeSource(user.id, {
            ...source,
            deckId,
            createdAt: source.createdAt || timestamp(),
            updatedAt: timestamp(),
          } as StoredKnowledgeSource);
        }
      }
    } catch (error) {
      console.error('Failed to save knowledge sources:', error);
      toast.error("知識ソースの保存に失敗しました: " + (error as any)?.message);
    }
  }, [user?.id]);

  // Update deck stats when cards change
  useEffect(() => {
    if (decks.length === 0) return;

    setDecks((prevDecks) =>
      prevDecks.map((deck) => {
        const deckCards = cards[deck.id] || [];
        const retentionRate = calculateDeckRetentionRate(deckCards);
        const dueCount = deckCards.filter(card => isDue(card.nextReviewDate)).length;
        const newCount = deckCards.filter(card => !card.lastReviewedDate).length;

        return {
          ...deck,
          retentionRate,
          dueCount,
          newCount,
          totalCards: deckCards.length,
        };
      })
    );
  }, [cards]);

  // Use modular hooks
  const {
    handleCreateDeck,
    handleEditDeck,
    handleSaveDeck,
    handleDeleteDeck,
  } = useDeckOperations({
    user,
    decks,
    setDecks,
    setCards,
    setKnowledgeSources,
    setCurrentScreen,
    selectedDeck,
    setEditingDeck,
    setDeckDialogOpen,
    setDeleteDeckId,
    saveDecks,
  });

  const {
    handleAddCard,
    handleEditCard,
    handleSaveCard,
    handleDeleteCard,
    handleGeneratedCardsAdd,
  } = useCardOperations({
    user,
    cards,
    setCards,
    selectedDeckId,
    setEditingCard,
    setCardDialogOpen,
    saveCards,
  });

  const {
    handleAddKnowledgeSource,
    handleEditKnowledgeSource,
    handleSaveKnowledgeSource,
    handleDeleteKnowledgeSource,
  } = useKnowledgeSourceOperations({
    user,
    knowledgeSources,
    setKnowledgeSources,
    selectedDeckId,
    setEditingKnowledgeSource,
    setKnowledgeSourceDialogOpen,
    saveKnowledgeSources,
  });

  const {
    handleViewDeck,
    handleStartReview,
    handleStartSingleCardReview,
    handleStartCrossDeckReview,
    handleStartCrossDeckNew,
    handleViewCrossDeckMastered,
    handleSessionComplete,
    handleReturnHome,
    handleBackToDeck,
    handleReviewAgain,
  } = useReviewSession({
    user,
    decks,
    cards,
    setCards,
    selectedDeckId,
    setSelectedDeckId,
    setCurrentScreen,
    setSessionResults,
    saveCards,
    singleStudyCardId,
    setSingleStudyCardId,
    crossDeckMode,
    setCrossDeckMode,
  });

  const handleGenerateCards = () => {
    setGenerateCardsDialogOpen(true);
  };

  const wrappedHandleDeleteDeck = async () => {
    await handleDeleteDeck(deleteDeckId);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#14b8a6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#7F8C8D]">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentScreen === "home" && (
        <Home
          decks={decks}
          cards={cards}
          onStartReview={handleStartReview}
          onCreateDeck={handleCreateDeck}
          onViewDeck={handleViewDeck}
          onStartCrossDeckReview={handleStartCrossDeckReview}
          onStartCrossDeckNew={handleStartCrossDeckNew}
          onViewCrossDeckMastered={handleViewCrossDeckMastered}
        />
      )}

      {currentScreen === "deckDetail" && selectedDeck && (
        <DeckDetail
          deckId={selectedDeck.id}
          deckName={selectedDeck.name}
          deckDescription={selectedDeck.description}
          deckRetentionRate={selectedDeck.retentionRate}
          knowledgeSources={knowledgeSources[selectedDeck.id] || []}
          cards={cards[selectedDeck.id] || []}
          onBack={handleReturnHome}
          onStartReview={() => handleStartReview()}
          onEditDeck={handleEditDeck}
          onDeleteDeck={() => setDeleteDeckId(selectedDeck.id)}
          onAddCard={handleAddCard}
          onEditCard={handleEditCard}
          onDeleteCard={handleDeleteCard}
          onStudySingleCard={handleStartSingleCardReview}
          onAddKnowledgeSource={handleAddKnowledgeSource}
          onEditKnowledgeSource={handleEditKnowledgeSource}
          onDeleteKnowledgeSource={handleDeleteKnowledgeSource}
          onGenerateCards={handleGenerateCards}
        />
      )}

      {currentScreen === "review" && selectedDeck && (
        <ReviewSession
          deckName={selectedDeck.name}
          knowledgeSources={knowledgeSources[selectedDeck.id] || []}
          cards={(cards[selectedDeck.id] || []).slice().sort((a, b) => {
            // 優先順位: 1. 新規カード 2. 復習期限切れ 3. 復習期限 4. まだ先
            const getPriority = (card: FlashCard) => {
              if (!card.lastReviewedDate) return 0; // 新規
              if (!card.nextReviewDate) return 1;
              const now = new Date();
              const next = new Date(card.nextReviewDate);
              if (next <= now) return 1; // 期限切れ・期限
              return 2; // まだ先
            };
            return getPriority(a) - getPriority(b);
          })}
          onComplete={handleSessionComplete}
          onExit={handleBackToDeck}
        />
      )}

      {currentScreen === "studySingleCard" && selectedDeck && singleStudyCardId && (
        <ReviewSession
          deckName={`${selectedDeck.name}（1枚学習）`}
          knowledgeSources={knowledgeSources[selectedDeck.id] || []}
          cards={(cards[selectedDeck.id] || []).filter(c => c.id === singleStudyCardId)}
          onComplete={handleSessionComplete}
          onExit={handleBackToDeck}
        />
      )}

      {/* Cross-deck review: 全デッキの復習カード */}
      {currentScreen === "crossDeckReview" && (() => {
        const allDueCards = Object.entries(cards).flatMap(([deckId, deckCards]) =>
          deckCards.filter(card => isDue(card.nextReviewDate)).map(card => ({ ...card, deckId }))
        ).sort((a, b) => {
          // 復習期限が早いものを優先
          if (!a.nextReviewDate) return 1;
          if (!b.nextReviewDate) return -1;
          return new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime();
        });
        const allKnowledgeSources = Object.values(knowledgeSources).flat();
        return allDueCards.length > 0 ? (
          <ReviewSession
            deckName="全デッキ復習"
            knowledgeSources={allKnowledgeSources}
            cards={allDueCards}
            onComplete={handleSessionComplete}
            onExit={handleReturnHome}
          />
        ) : null;
      })()}

      {/* Cross-deck new: 全デッキの新規カード */}
      {currentScreen === "crossDeckNew" && (() => {
        const allNewCards = Object.entries(cards).flatMap(([deckId, deckCards]) =>
          deckCards.filter(card => !card.lastReviewedDate).map(card => ({ ...card, deckId }))
        );
        const allKnowledgeSources = Object.values(knowledgeSources).flat();
        return allNewCards.length > 0 ? (
          <ReviewSession
            deckName="全デッキ新規学習"
            knowledgeSources={allKnowledgeSources}
            cards={allNewCards}
            onComplete={handleSessionComplete}
            onExit={handleReturnHome}
          />
        ) : null;
      })()}

      {/* Cross-deck mastered: 全デッキの定着済みカード一覧（閲覧のみ） */}
      {currentScreen === "crossDeckMastered" && (() => {
        const allMasteredCards = Object.entries(cards).flatMap(([deckId, deckCards]) => {
          const deck = decks.find(d => d.id === deckId);
          return deckCards
            .filter(card => card.lastReviewedDate && !isDue(card.nextReviewDate))
            .map(card => ({ ...card, deckId, deckName: deck?.name || "不明" }));
        });
        return (
          <div className="min-h-screen bg-[#F9FAFB] py-6 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => handleReturnHome()}
                  className="text-[#7F8C8D] hover:text-[#2C3E50] p-2"
                >
                  ←
                </button>
                <h1 className="text-xl font-semibold text-[#2C3E50]">
                  定着済みカード ({allMasteredCards.length}枚)
                </h1>
              </div>
              <div className="space-y-3">
                {allMasteredCards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-white border border-[#E5E7EB] rounded-lg p-4 shadow-sm"
                  >
                    <div className="text-xs text-[#7F8C8D] mb-2">{card.deckName}</div>
                    <div className="text-sm text-[#2C3E50] font-medium mb-1">Q: {card.question}</div>
                    <div className="text-sm text-[#7F8C8D]">A: {card.answer}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {currentScreen === "complete" && sessionResults && (
        <SessionComplete
          deckName={crossDeckMode ? (crossDeckMode === "review" ? "全デッキ復習" : "全デッキ新規学習") : (selectedDeck?.name || "")}
          results={sessionResults}
          onReturnHome={handleReturnHome}
          onReviewAgain={crossDeckMode ? (crossDeckMode === "review" ? handleStartCrossDeckReview : handleStartCrossDeckNew) : handleReviewAgain}
        />
      )}

      {/* Deck Dialog */}
      <DeckDialog
        open={deckDialogOpen}
        deck={editingDeck}
        onClose={() => {
          setDeckDialogOpen(false);
          setEditingDeck(null);
        }}
        onSave={handleSaveDeck}
      />

      {/* Card Dialog */}
      <CardDialog
        open={cardDialogOpen}
        card={editingCard}
        onClose={() => {
          setCardDialogOpen(false);
          setEditingCard(null);
        }}
        onSave={handleSaveCard}
      />

      {/* Knowledge Source Dialog */}
      <KnowledgeSourceDialog
        open={knowledgeSourceDialogOpen}
        source={editingKnowledgeSource}
        onClose={() => {
          setKnowledgeSourceDialogOpen(false);
          setEditingKnowledgeSource(null);
        }}
        onSave={handleSaveKnowledgeSource}
      />

      {/* Generate Cards Dialog */}
      {selectedDeck && (
        <GenerateCardsDialog
          open={generateCardsDialogOpen}
          knowledgeSources={knowledgeSources[selectedDeck.id] || []}
          deckId={selectedDeck.id}
          deckName={selectedDeck.name}
          onClose={() => setGenerateCardsDialogOpen(false)}
          onGenerate={handleGeneratedCardsAdd}
        />
      )}

      {/* Delete Deck Confirmation */}
      <AlertDialog
        open={deleteDeckId !== null}
        onOpenChange={(open) => !open && setDeleteDeckId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>デッキを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。デッキと全てのカードが完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={wrappedHandleDeleteDeck}
              className="bg-[#FF6B6B] hover:bg-[#FF5252]"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </>
  );
}
