/**
 * UI types and conversion utilities for App
 */

import { calculateDeckRetentionRate, isDue } from "../utils/spacedRepetition";
import { timestamp } from "../lib/dataStore";
import type { Deck as StoredDeck } from "../lib/types";

// UI types (with computed fields)
export interface Deck {
  id: string;
  name: string;
  dueCount: number;
  newCount: number;
  totalCards: number;
  color: string;
  description?: string;
  retentionRate?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FlashCard {
  id: string;
  deckId?: string;
  question: string;
  answer: string;
  lastReviewedDate?: string;
  nextReviewDate?: string;
  interval?: number;
  easeFactor?: number;
  reviewCount?: number;
  lapseCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface KnowledgeSource {
  id: string;
  deckId?: string;
  name: string;
  content: string;
  type: "text" | "file";
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewResults {
  total: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
  cardReviews?: Array<{
    cardId: string;
    rating: "again" | "hard" | "good" | "easy";
  }>;
}

export type Screen =
  | "home"
  | "deckDetail"
  | "review"
  | "complete"
  | "studySingleCard"
  | "crossDeckReview"    // 全デッキの復習カード
  | "crossDeckNew"       // 全デッキの新規カード
  | "crossDeckMastered"; // 全デッキの定着済みカード一覧

// Convert stored deck to UI deck (add computed fields)
export function toUIDeck(deck: StoredDeck, cards: FlashCard[]): Deck {
  const dueCount = cards.filter(card => isDue(card.nextReviewDate)).length;
  const newCount = cards.filter(card => !card.lastReviewedDate).length;
  const retentionRate = calculateDeckRetentionRate(cards);

  return {
    ...deck,
    dueCount,
    newCount,
    totalCards: cards.length,
    retentionRate,
  };
}

// Convert UI deck to stored deck (remove computed fields)
export function toStoredDeck(deck: Deck): StoredDeck {
  return {
    id: deck.id,
    name: deck.name,
    color: deck.color,
    description: deck.description,
    createdAt: deck.createdAt || timestamp(),
    updatedAt: timestamp(),
  };
}
