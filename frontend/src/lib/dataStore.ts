/**
 * Data Store — Wails (Go + SQLite) implementation.
 *
 * Replaces the original localStorage-based provider. The desktop app
 * is single-user, so userId is ignored at this layer.
 */

import type { Deck, FlashCard, KnowledgeSource } from "./types";
import {
  WailsHandler as DeckService,
  Deck as GoDeck,
} from "../../bindings/github.com/O6lvl4/memre/internal/deck";
import {
  WailsHandler as CardService,
  Card as GoCard,
} from "../../bindings/github.com/O6lvl4/memre/internal/card";
import {
  WailsHandler as KnowledgeSourceService,
  Source as GoKS,
} from "../../bindings/github.com/O6lvl4/memre/internal/knowledge";

export interface StorageProvider {
  getDecks(userId: string): Promise<Deck[]>;
  getDeck(userId: string, deckId: string): Promise<Deck | null>;
  saveDeck(userId: string, deck: Deck): Promise<void>;
  deleteDeck(userId: string, deckId: string): Promise<void>;

  getCards(userId: string, deckId: string): Promise<FlashCard[]>;
  getAllCards(userId: string): Promise<Record<string, FlashCard[]>>;
  saveCard(userId: string, card: FlashCard): Promise<void>;
  saveCards(userId: string, cards: FlashCard[]): Promise<void>;
  deleteCard(userId: string, cardId: string): Promise<void>;

  getKnowledgeSources(userId: string, deckId: string): Promise<KnowledgeSource[]>;
  getAllKnowledgeSources(userId: string): Promise<Record<string, KnowledgeSource[]>>;
  saveKnowledgeSource(userId: string, source: KnowledgeSource): Promise<void>;
  deleteKnowledgeSource(userId: string, sourceId: string): Promise<void>;

  exportAllData(userId: string): Promise<{
    decks: Deck[];
    cards: Record<string, FlashCard[]>;
    knowledgeSources: Record<string, KnowledgeSource[]>;
  }>;
  importAllData(
    userId: string,
    data: {
      decks: Deck[];
      cards: Record<string, FlashCard[]>;
      knowledgeSources: Record<string, KnowledgeSource[]>;
    }
  ): Promise<void>;
}

function asDeck(d: any): Deck {
  return {
    id: d.id,
    name: d.name,
    color: d.color,
    description: d.description ?? "",
    level: (d.level as Deck["level"]) || "beginner",
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

function asCard(c: any): FlashCard {
  return {
    id: c.id,
    deckId: c.deckId,
    question: c.question,
    answer: c.answer,
    lastReviewedDate: c.lastReviewedDate || undefined,
    nextReviewDate: c.nextReviewDate || undefined,
    interval: c.interval ?? 0,
    easeFactor: c.easeFactor ?? 2.5,
    reviewCount: c.reviewCount ?? 0,
    lapseCount: c.lapseCount ?? 0,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function asKS(s: any): KnowledgeSource {
  return {
    id: s.id,
    deckId: s.deckId,
    name: s.name,
    content: s.content,
    type: s.type as "text" | "file",
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

class WailsProvider implements StorageProvider {
  async getDecks(): Promise<Deck[]> {
    const list = (await DeckService.ListDecks()) ?? [];
    return list.map((d: any) => asDeck(d));
  }

  async getDeck(_: string, deckId: string): Promise<Deck | null> {
    const decks = await this.getDecks();
    return decks.find((d) => d.id === deckId) ?? null;
  }

  async saveDeck(_: string, deck: Deck): Promise<void> {
    // Frontend-supplied id is canonical: Go uses it as-is when creating.
    // We treat synthetic ids (timestamp-based from generateId()) as "new".
    const looksNew = !deck.id || /^\d+-/.test(deck.id);
    const payload = new GoDeck({
      id: deck.id,
      name: deck.name,
      color: deck.color,
      description: deck.description ?? "",
      level: deck.level ?? "beginner",
      createdAt: deck.createdAt ?? "",
      updatedAt: deck.updatedAt ?? "",
    } as any);
    if (looksNew) {
      await DeckService.CreateDeck(payload);
    } else {
      await DeckService.UpdateDeck(payload);
    }
  }

  async deleteDeck(_: string, deckId: string): Promise<void> {
    await DeckService.DeleteDeck(deckId);
  }

  async getCards(_: string, deckId: string): Promise<FlashCard[]> {
    const list = (await CardService.ListCards(deckId)) ?? [];
    return list.map((c: any) => asCard(c));
  }

  async getAllCards(_: string): Promise<Record<string, FlashCard[]>> {
    const decks = await this.getDecks();
    const out: Record<string, FlashCard[]> = {};
    await Promise.all(
      decks.map(async (d) => {
        out[d.id] = await this.getCards("", d.id);
      })
    );
    return out;
  }

  async saveCard(_: string, card: FlashCard): Promise<void> {
    const looksNew = !card.id || /^\d+-/.test(card.id);
    const payload = new GoCard({
      id: card.id,
      deckId: card.deckId,
      question: card.question,
      answer: card.answer,
      lastReviewedDate: card.lastReviewedDate ?? "",
      nextReviewDate: card.nextReviewDate ?? "",
      interval: card.interval ?? 0,
      easeFactor: card.easeFactor ?? 2.5,
      reviewCount: card.reviewCount ?? 0,
      lapseCount: card.lapseCount ?? 0,
      createdAt: card.createdAt ?? "",
      updatedAt: card.updatedAt ?? "",
    } as any);
    if (looksNew) {
      await CardService.CreateCard(payload);
    } else {
      await CardService.UpdateCard(payload);
    }
  }

  async saveCards(userId: string, cards: FlashCard[]): Promise<void> {
    for (const c of cards) {
      await this.saveCard(userId, c);
    }
  }

  async deleteCard(_: string, cardId: string): Promise<void> {
    await CardService.DeleteCard(cardId);
  }

  async getKnowledgeSources(_: string, deckId: string): Promise<KnowledgeSource[]> {
    const list = (await KnowledgeSourceService.ListByDeck(deckId)) ?? [];
    return list.map((s: any) => asKS(s));
  }

  async getAllKnowledgeSources(_: string): Promise<Record<string, KnowledgeSource[]>> {
    const decks = await this.getDecks();
    const out: Record<string, KnowledgeSource[]> = {};
    await Promise.all(
      decks.map(async (d) => {
        out[d.id] = await this.getKnowledgeSources("", d.id);
      })
    );
    return out;
  }

  async saveKnowledgeSource(_: string, source: KnowledgeSource): Promise<void> {
    const looksNew = !source.id || /^\d+-/.test(source.id);
    const payload = new GoKS({
      id: source.id,
      deckId: source.deckId,
      name: source.name,
      content: source.content,
      type: source.type,
      createdAt: source.createdAt ?? "",
      updatedAt: source.updatedAt ?? "",
    } as any);
    if (looksNew) {
      await KnowledgeSourceService.Create(payload);
    } else {
      await KnowledgeSourceService.Update(payload);
    }
  }

  async deleteKnowledgeSource(_: string, sourceId: string): Promise<void> {
    await KnowledgeSourceService.Delete(sourceId);
  }

  async exportAllData(userId: string) {
    const [decks, cards, knowledgeSources] = await Promise.all([
      this.getDecks(),
      this.getAllCards(userId),
      this.getAllKnowledgeSources(userId),
    ]);
    return { decks, cards, knowledgeSources };
  }

  async importAllData() {
    throw new Error("importAllData is not implemented for the Wails provider yet");
  }
}

export const dataStore: StorageProvider = new WailsProvider();

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function timestamp(): string {
  return new Date().toISOString();
}
