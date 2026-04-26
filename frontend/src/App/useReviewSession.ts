/**
 * Review session handlers
 */

import { calculateNextReview } from "../utils/spacedRepetition";
import { timestamp } from "../lib/dataStore";
import type { Deck, FlashCard, ReviewResults, Screen } from "./types";

interface UseReviewSessionParams {
  user: { id?: string } | null;
  decks: Deck[];
  cards: Record<string, FlashCard[]>;
  setCards: React.Dispatch<React.SetStateAction<Record<string, FlashCard[]>>>;
  selectedDeckId: string | null;
  setSelectedDeckId: (id: string | null) => void;
  setCurrentScreen: (screen: Screen) => void;
  setSessionResults: (results: ReviewResults | null) => void;
  saveCards: (cards: Record<string, FlashCard[]>) => Promise<void>;
  singleStudyCardId: string | null;
  setSingleStudyCardId: (id: string | null) => void;
  crossDeckMode: "review" | "new" | null;
  setCrossDeckMode: (mode: "review" | "new" | null) => void;
}

export function useReviewSession(params: UseReviewSessionParams) {
  const {
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
  } = params;

  const handleViewDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setCurrentScreen("deckDetail");
  };

  const handleStartReview = (deckId?: string) => {
    const id = deckId || selectedDeckId;
    if (!id) return;

    const deck = decks.find((d) => d.id === id);
    if (deck && (deck.dueCount > 0 || (cards[id]?.length || 0) > 0)) {
      setSelectedDeckId(id);
      setSingleStudyCardId(null); // Clear single card mode
      setCurrentScreen("review");
    }
  };

  const handleStartSingleCardReview = (cardId: string) => {
    if (!selectedDeckId) return;
    setSingleStudyCardId(cardId);
    setCurrentScreen("studySingleCard");
  };

  const handleStartCrossDeckReview = () => {
    setCrossDeckMode("review");
    setSelectedDeckId(null);
    setCurrentScreen("crossDeckReview");
  };

  const handleStartCrossDeckNew = () => {
    setCrossDeckMode("new");
    setSelectedDeckId(null);
    setCurrentScreen("crossDeckNew");
  };

  const handleViewCrossDeckMastered = () => {
    setCrossDeckMode(null);
    setSelectedDeckId(null);
    setCurrentScreen("crossDeckMastered");
  };

  const handleSessionComplete = async (results: ReviewResults) => {
    const isSingleCardMode = singleStudyCardId !== null;
    const isCrossDeckMode = crossDeckMode !== null;

    if (results.cardReviews && user?.id) {
      if (isCrossDeckMode) {
        // Cross-deck mode: update cards across multiple decks
        const updatedCardsState = { ...cards };
        const cardsToSave: Record<string, FlashCard[]> = {};

        for (const [deckId, deckCards] of Object.entries(cards)) {
          const updatedDeckCards = deckCards.map((card) => {
            const review = results.cardReviews?.find((r) => r.cardId === card.id);
            if (review) {
              const schedule = calculateNextReview(
                review.rating,
                card.interval || 1,
                card.easeFactor || 2.5
              );
              return {
                ...card,
                lastReviewedDate: new Date().toISOString(),
                nextReviewDate: schedule.nextReviewDate,
                interval: schedule.interval,
                easeFactor: schedule.easeFactor,
                reviewCount: (card.reviewCount || 0) + 1,
                lapseCount: review.rating === "again"
                  ? (card.lapseCount || 0) + 1
                  : card.lapseCount,
                updatedAt: timestamp(),
              };
            }
            return card;
          });

          // Check if any cards were updated in this deck
          const hasUpdates = updatedDeckCards.some((card, i) => card !== deckCards[i]);
          if (hasUpdates) {
            updatedCardsState[deckId] = updatedDeckCards;
            cardsToSave[deckId] = updatedDeckCards;
          }
        }

        setCards(updatedCardsState);
        await saveCards(cardsToSave);

        // Cross-deck mode: go back to home
        setCrossDeckMode(null);
        setSessionResults(results);
        setCurrentScreen("complete");
        return;
      } else if (selectedDeckId) {
        // Single deck mode
        const deckCards = cards[selectedDeckId] || [];
        const updatedCards = deckCards.map((card) => {
          const review = results.cardReviews?.find((r) => r.cardId === card.id);
          if (review) {
            const schedule = calculateNextReview(
              review.rating,
              card.interval || 1,
              card.easeFactor || 2.5
            );
            return {
              ...card,
              lastReviewedDate: new Date().toISOString(),
              nextReviewDate: schedule.nextReviewDate,
              interval: schedule.interval,
              easeFactor: schedule.easeFactor,
              reviewCount: (card.reviewCount || 0) + 1,
              lapseCount: review.rating === "again"
                ? (card.lapseCount || 0) + 1
                : card.lapseCount,
              updatedAt: timestamp(),
            };
          }
          return card;
        });

        const newCardsState = {
          ...cards,
          [selectedDeckId]: updatedCards,
        };
        setCards(newCardsState);
        await saveCards({ [selectedDeckId]: updatedCards });
      }
    }

    // Single card mode: go back to deck detail directly
    if (isSingleCardMode) {
      setSingleStudyCardId(null);
      setCurrentScreen("deckDetail");
      return;
    }

    setSessionResults(results);
    setCurrentScreen("complete");
  };

  const handleReturnHome = async (partialResults?: ReviewResults) => {
    // 途中終了でも結果があれば保存
    if (partialResults && partialResults.cardReviews && partialResults.cardReviews.length > 0 && user?.id) {
      await savePartialResults(partialResults);
    }
    setCrossDeckMode(null);
    setCurrentScreen("home");
    setSelectedDeckId(null);
    setSessionResults(null);
  };

  const handleBackToDeck = async (partialResults?: ReviewResults) => {
    // 途中終了でも結果があれば保存
    if (partialResults && partialResults.cardReviews && partialResults.cardReviews.length > 0 && user?.id) {
      await savePartialResults(partialResults);
    }
    setSingleStudyCardId(null);
    setCurrentScreen("deckDetail");
    setSessionResults(null);
  };

  // 部分的な結果を保存するヘルパー関数
  const savePartialResults = async (results: ReviewResults) => {
    if (!results.cardReviews || results.cardReviews.length === 0) return;

    const isCrossDeckMode = crossDeckMode !== null;

    if (isCrossDeckMode) {
      // Cross-deck mode: update cards across multiple decks
      const updatedCardsState = { ...cards };
      const cardsToSave: Record<string, FlashCard[]> = {};

      for (const [deckId, deckCards] of Object.entries(cards)) {
        const updatedDeckCards = deckCards.map((card) => {
          const review = results.cardReviews?.find((r) => r.cardId === card.id);
          if (review) {
            const schedule = calculateNextReview(
              review.rating,
              card.interval || 1,
              card.easeFactor || 2.5
            );
            return {
              ...card,
              lastReviewedDate: new Date().toISOString(),
              nextReviewDate: schedule.nextReviewDate,
              interval: schedule.interval,
              easeFactor: schedule.easeFactor,
              reviewCount: (card.reviewCount || 0) + 1,
              lapseCount: review.rating === "again"
                ? (card.lapseCount || 0) + 1
                : card.lapseCount,
              updatedAt: timestamp(),
            };
          }
          return card;
        });

        const hasUpdates = updatedDeckCards.some((card, i) => card !== deckCards[i]);
        if (hasUpdates) {
          updatedCardsState[deckId] = updatedDeckCards;
          cardsToSave[deckId] = updatedDeckCards;
        }
      }

      setCards(updatedCardsState);
      await saveCards(cardsToSave);
    } else if (selectedDeckId) {
      // Single deck mode
      const deckCards = cards[selectedDeckId] || [];
      const updatedCards = deckCards.map((card) => {
        const review = results.cardReviews?.find((r) => r.cardId === card.id);
        if (review) {
          const schedule = calculateNextReview(
            review.rating,
            card.interval || 1,
            card.easeFactor || 2.5
          );
          return {
            ...card,
            lastReviewedDate: new Date().toISOString(),
            nextReviewDate: schedule.nextReviewDate,
            interval: schedule.interval,
            easeFactor: schedule.easeFactor,
            reviewCount: (card.reviewCount || 0) + 1,
            lapseCount: review.rating === "again"
              ? (card.lapseCount || 0) + 1
              : card.lapseCount,
            updatedAt: timestamp(),
          };
        }
        return card;
      });

      const newCardsState = {
        ...cards,
        [selectedDeckId]: updatedCards,
      };
      setCards(newCardsState);
      await saveCards({ [selectedDeckId]: updatedCards });
    }
  };

  const handleReviewAgain = () => {
    setCurrentScreen("review");
    setSessionResults(null);
  };

  return {
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
  };
}
