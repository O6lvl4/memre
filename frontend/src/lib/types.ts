// Shared types for MemRE app
// These types are used across the app and storage layer

export interface Deck {
  id: string;
  name: string;
  color: string;
  description?: string;
  level?: "beginner" | "intermediate" | "advanced";
  createdAt: string;
  updatedAt: string;
}

export interface FlashCard {
  id: string;
  deckId: string;
  question: string;
  answer: string;
  // Spaced repetition fields
  lastReviewedDate?: string;
  nextReviewDate?: string;
  interval?: number;
  easeFactor?: number;
  reviewCount?: number;
  lapseCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeSource {
  id: string;
  deckId: string;
  name: string;
  content: string;
  type: "text" | "file";
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// Computed deck stats (not stored, calculated on read)
export interface DeckWithStats extends Deck {
  dueCount: number;
  newCount: number;
  totalCards: number;
  retentionRate?: number;
}
