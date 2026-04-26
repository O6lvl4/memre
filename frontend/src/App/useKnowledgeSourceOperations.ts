/**
 * Knowledge source operation handlers
 */

import { toast } from "sonner";
import { dataStore, generateId, timestamp } from "../lib/dataStore";
import type { KnowledgeSource as StoredKnowledgeSource } from "../lib/types";
import type { KnowledgeSource } from "./types";

interface UseKnowledgeSourceOperationsParams {
  user: { id?: string } | null;
  knowledgeSources: Record<string, KnowledgeSource[]>;
  setKnowledgeSources: React.Dispatch<React.SetStateAction<Record<string, KnowledgeSource[]>>>;
  selectedDeckId: string | null;
  setEditingKnowledgeSource: (source: KnowledgeSource | null) => void;
  setKnowledgeSourceDialogOpen: (open: boolean) => void;
  saveKnowledgeSources: (sources: Record<string, KnowledgeSource[]>) => Promise<void>;
}

export function useKnowledgeSourceOperations(params: UseKnowledgeSourceOperationsParams) {
  const {
    user,
    knowledgeSources,
    setKnowledgeSources,
    selectedDeckId,
    setEditingKnowledgeSource,
    setKnowledgeSourceDialogOpen,
    saveKnowledgeSources,
  } = params;

  const handleAddKnowledgeSource = () => {
    setEditingKnowledgeSource(null);
    setKnowledgeSourceDialogOpen(true);
  };

  const handleEditKnowledgeSource = (sourceId: string) => {
    if (selectedDeckId) {
      const source = knowledgeSources[selectedDeckId]?.find((s) => s.id === sourceId);
      if (source) {
        setEditingKnowledgeSource(source);
        setKnowledgeSourceDialogOpen(true);
      }
    }
  };

  const handleSaveKnowledgeSource = async (source: Omit<KnowledgeSource, "id"> & { id?: string }) => {
    if (!selectedDeckId || !user?.id) return;

    if (source.id) {
      // Edit existing source
      const updatedSources = {
        ...knowledgeSources,
        [selectedDeckId]: knowledgeSources[selectedDeckId].map((s) =>
          s.id === source.id
            ? { ...s, name: source.name, content: source.content, type: source.type, updatedAt: timestamp() }
            : s
        ),
      };
      setKnowledgeSources(updatedSources);
      await saveKnowledgeSources({ [selectedDeckId]: updatedSources[selectedDeckId] });
      toast.success("知識ソースを更新しました");
    } else {
      // Create new source
      const newSource: KnowledgeSource = {
        id: generateId(),
        deckId: selectedDeckId,
        name: source.name,
        content: source.content,
        type: source.type,
        createdAt: timestamp(),
        updatedAt: timestamp(),
      };
      const updatedSources = {
        ...knowledgeSources,
        [selectedDeckId]: [...(knowledgeSources[selectedDeckId] || []), newSource],
      };
      setKnowledgeSources(updatedSources);
      await saveKnowledgeSources({ [selectedDeckId]: [newSource] });
      toast.success("知識ソースを追加しました");
    }
  };

  const handleDeleteKnowledgeSource = async (sourceId: string) => {
    if (!selectedDeckId || !user?.id) return;

    try {
      await dataStore.deleteKnowledgeSource(user.id, sourceId);
      setKnowledgeSources((prev) => ({
        ...prev,
        [selectedDeckId]: prev[selectedDeckId].filter((s) => s.id !== sourceId),
      }));
      toast.success("知識ソースを削除しました");
    } catch (error) {
      console.error('Failed to delete knowledge source:', error);
      toast.error("知識ソースの削除に失敗しました");
    }
  };

  return {
    handleAddKnowledgeSource,
    handleEditKnowledgeSource,
    handleSaveKnowledgeSource,
    handleDeleteKnowledgeSource,
  };
}
