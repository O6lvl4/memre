/**
 * Card operation handlers
 */

import { toast } from "sonner";
import { dataStore, generateId, timestamp } from "../lib/dataStore";
import type { FlashCard } from "./types";

interface UseCardOperationsParams {
  user: { id?: string } | null;
  cards: Record<string, FlashCard[]>;
  setCards: React.Dispatch<React.SetStateAction<Record<string, FlashCard[]>>>;
  selectedDeckId: string | null;
  setEditingCard: (card: FlashCard | null) => void;
  setCardDialogOpen: (open: boolean) => void;
  saveCards: (cards: Record<string, FlashCard[]>) => Promise<void>;
}

export function useCardOperations(params: UseCardOperationsParams) {
  const {
    user,
    cards,
    setCards,
    selectedDeckId,
    setEditingCard,
    setCardDialogOpen,
    saveCards,
  } = params;

  const handleAddCard = () => {
    setEditingCard(null);
    setCardDialogOpen(true);
  };

  const handleEditCard = (cardId: string) => {
    if (selectedDeckId) {
      const card = cards[selectedDeckId]?.find((c) => c.id === cardId);
      if (card) {
        setEditingCard(card);
        setCardDialogOpen(true);
      }
    }
  };

  const handleSaveCard = async (card: Omit<FlashCard, "id"> & { id?: string }) => {
    if (!selectedDeckId || !user?.id) return;

    if (card.id) {
      // Edit existing card
      const updatedCards = {
        ...cards,
        [selectedDeckId]: cards[selectedDeckId].map((c) =>
          c.id === card.id
            ? { ...c, question: card.question, answer: card.answer, updatedAt: timestamp() }
            : c
        ),
      };
      setCards(updatedCards);
      await saveCards({ [selectedDeckId]: updatedCards[selectedDeckId] });
      toast.success("カードを更新しました");
    } else {
      // Create new card
      const newCard: FlashCard = {
        id: generateId(),
        deckId: selectedDeckId,
        question: card.question,
        answer: card.answer,
        easeFactor: 2.5,
        reviewCount: 0,
        lapseCount: 0,
        createdAt: timestamp(),
        updatedAt: timestamp(),
      };
      const updatedCards = {
        ...cards,
        [selectedDeckId]: [...(cards[selectedDeckId] || []), newCard],
      };
      setCards(updatedCards);
      await saveCards({ [selectedDeckId]: [newCard] });
      toast.success("カードを作成しました");
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!selectedDeckId || !user?.id) return;

    try {
      await dataStore.deleteCard(user.id, cardId);
      setCards((prev) => ({
        ...prev,
        [selectedDeckId]: prev[selectedDeckId].filter((c) => c.id !== cardId),
      }));
      toast.success("カードを削除しました");
    } catch (error) {
      console.error('Failed to delete card:', error);
      toast.error("カードの削除に失敗しました");
    }
  };

  const handleGeneratedCardsAdd = async (generatedCards: Array<{ question: string; answer: string }>) => {
    if (!selectedDeckId || !user?.id) return;

    const newCards: FlashCard[] = generatedCards.map((card) => ({
      id: generateId(),
      deckId: selectedDeckId,
      question: card.question,
      answer: card.answer,
      easeFactor: 2.5,
      reviewCount: 0,
      lapseCount: 0,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    }));

    const updatedCards = {
      ...cards,
      [selectedDeckId]: [...(cards[selectedDeckId] || []), ...newCards],
    };
    setCards(updatedCards);
    await saveCards({ [selectedDeckId]: newCards });

    toast.success(`${newCards.length}枚のカードを追加しました`);
  };

  return {
    handleAddCard,
    handleEditCard,
    handleSaveCard,
    handleDeleteCard,
    handleGeneratedCardsAdd,
  };
}
