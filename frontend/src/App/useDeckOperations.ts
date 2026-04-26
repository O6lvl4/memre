/**
 * Deck operation handlers
 */

import { toast } from "sonner";
import { dataStore, generateId, timestamp } from "../lib/dataStore";
import type { Deck, FlashCard, KnowledgeSource } from "./types";
import { toStoredDeck } from "./types";

interface UseDeckOperationsParams {
  user: { id?: string } | null;
  decks: Deck[];
  setDecks: React.Dispatch<React.SetStateAction<Deck[]>>;
  setCards: React.Dispatch<React.SetStateAction<Record<string, FlashCard[]>>>;
  setKnowledgeSources: React.Dispatch<React.SetStateAction<Record<string, KnowledgeSource[]>>>;
  setCurrentScreen: (screen: "home" | "deckDetail" | "review" | "complete") => void;
  selectedDeck: Deck | null;
  setEditingDeck: (deck: Deck | null) => void;
  setDeckDialogOpen: (open: boolean) => void;
  setDeleteDeckId: (id: string | null) => void;
  saveDecks: (decks: Deck[]) => Promise<void>;
}

export function useDeckOperations(params: UseDeckOperationsParams) {
  const {
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
  } = params;

  const handleCreateDeck = () => {
    setEditingDeck(null);
    setDeckDialogOpen(true);
  };

  const handleEditDeck = () => {
    if (selectedDeck) {
      setEditingDeck(selectedDeck);
      setDeckDialogOpen(true);
    }
  };

  const handleSaveDeck = async (deck: { name: string; color: string; description?: string; id?: string }) => {
    if (deck.id) {
      // Edit existing deck
      const updatedDecks = decks.map((d) =>
        d.id === deck.id
          ? { ...d, name: deck.name, color: deck.color, description: deck.description, updatedAt: timestamp() }
          : d
      );
      setDecks(updatedDecks);
      await saveDecks(updatedDecks.filter(d => d.id === deck.id));
      toast.success("デッキを更新しました");
    } else {
      // Create new deck
      const newDeck: Deck = {
        id: generateId(),
        name: deck.name,
        color: deck.color,
        description: deck.description,
        dueCount: 0,
        newCount: 0,
        totalCards: 0,
        createdAt: timestamp(),
        updatedAt: timestamp(),
      };
      const updatedDecks = [...decks, newDeck];
      setDecks(updatedDecks);
      setCards((prev) => ({ ...prev, [newDeck.id]: [] }));
      setKnowledgeSources((prev) => ({ ...prev, [newDeck.id]: [] }));
      await saveDecks([newDeck]);
      toast.success("デッキを作成しました");
    }
  };

  const handleDeleteDeck = async (deleteDeckId: string | null) => {
    if (!deleteDeckId || !user?.id) return;

    try {
      await dataStore.deleteDeck(user.id, deleteDeckId);
      setDecks((prev) => prev.filter((d) => d.id !== deleteDeckId));
      setCards((prev) => {
        const newCards = { ...prev };
        delete newCards[deleteDeckId];
        return newCards;
      });
      setKnowledgeSources((prev) => {
        const newSources = { ...prev };
        delete newSources[deleteDeckId];
        return newSources;
      });
      toast.success("デッキを削除しました");
    } catch (error) {
      console.error('Failed to delete deck:', error);
      toast.error("デッキの削除に失敗しました");
    }
    setDeleteDeckId(null);
    setCurrentScreen("home");
  };

  return {
    handleCreateDeck,
    handleEditDeck,
    handleSaveDeck,
    handleDeleteDeck,
  };
}
