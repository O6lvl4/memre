import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { MarkdownText } from "./MarkdownText";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Card } from "./ui/card";
import { Loader2, Sparkles, CheckCircle2, Edit2, Check, X, AlertCircle, Layers } from "lucide-react";
import { generateCards as generateCardsApi, generateCardsComprehensive, listProviders, type ProviderInfo } from "../lib/api";

interface KnowledgeSource {
  id: string;
  name: string;
  content: string;
  type: "text" | "file";
}

interface GeneratedCard {
  question: string;
  answer: string;
  selected: boolean;
  editing: boolean;
}

interface GeneratedCardItemProps {
  card: GeneratedCard;
  index: number;
  onToggle: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (question: string, answer: string) => void;
}

function GeneratedCardItem({ 
  card, 
  index, 
  onToggle, 
  onEdit, 
  onCancelEdit, 
  onSaveEdit 
}: GeneratedCardItemProps) {
  const [editQuestion, setEditQuestion] = useState(card.question);
  const [editAnswer, setEditAnswer] = useState(card.answer);

  useEffect(() => {
    if (card.editing) {
      setEditQuestion(card.question);
      setEditAnswer(card.answer);
    }
  }, [card.editing, card.question, card.answer]);

  const handleSave = () => {
    if (editQuestion.trim() && editAnswer.trim()) {
      onSaveEdit(editQuestion.trim(), editAnswer.trim());
    }
  };

  if (card.editing) {
    return (
      <Card className="p-4 border-[#4A90E2] bg-[#4A90E2]/5">
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-[#2C3E50] mb-1">質問</Label>
            <Textarea
              value={editQuestion}
              onChange={(e) => setEditQuestion(e.target.value)}
              className="min-h-[60px] resize-none"
              placeholder="質問を入力..."
            />
          </div>
          <div>
            <Label className="text-xs text-[#2C3E50] mb-1">解答</Label>
            <Textarea
              value={editAnswer}
              onChange={(e) => setEditAnswer(e.target.value)}
              className="min-h-[60px] resize-none"
              placeholder="解答を入力..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancelEdit}
            >
              <X className="w-3 h-3 mr-1" />
              キャンセル
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!editQuestion.trim() || !editAnswer.trim()}
              className="bg-[#4A90E2] hover:bg-[#357ABD] text-white"
            >
              <Check className="w-3 h-3 mr-1" />
              保存
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`p-4 transition-all ${
        card.selected
          ? "border-[#4A90E2] bg-[#4A90E2]/5"
          : "border-[#E8E8E8] hover:border-[#4A90E2]/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={card.selected}
          onCheckedChange={onToggle}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-xs bg-[#4A90E2] text-white px-2 py-0.5 rounded flex-shrink-0">
              Q
            </span>
            <div className="text-sm text-[#2C3E50] flex-1">
              <MarkdownText>{card.question}</MarkdownText>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs bg-[#50C878] text-white px-2 py-0.5 rounded flex-shrink-0">
              A
            </span>
            <div className="text-sm text-[#7F8C8D] flex-1">
              <MarkdownText>{card.answer}</MarkdownText>
            </div>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-8 w-8 text-[#7F8C8D] hover:text-[#4A90E2]"
          >
            <Edit2 className="w-3 h-3" />
          </Button>
          {card.selected && (
            <CheckCircle2 className="w-5 h-5 text-[#4A90E2] mt-1" />
          )}
        </div>
      </div>
    </Card>
  );
}

interface GenerateCardsDialogProps {
  open: boolean;
  knowledgeSources: KnowledgeSource[];
  deckId: string;
  deckName?: string;
  onClose: () => void;
  onGenerate: (cards: Array<{ question: string; answer: string }>) => void;
}

export function GenerateCardsDialog({
  open,
  knowledgeSources,
  deckId,
  deckName,
  onClose,
  onGenerate,
}: GenerateCardsDialogProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [cardCount, setCardCount] = useState<string>("5");
  const [comprehensiveMode, setComprehensiveMode] = useState(false);
  const [cardDensity, setCardDensity] = useState<string>("auto"); // auto, sparse, dense
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [step, setStep] = useState<"select" | "generating" | "review">("select");
  const [error, setError] = useState<string | null>(null);
  const [generationStats, setGenerationStats] = useState<{ chunks: number; totalExtracted: number } | null>(null);

  // Per-call provider override. Empty string = use settings default.
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providerOverride, setProviderOverride] = useState<string>("");
  const [modelOverride, setModelOverride] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    listProviders().then(setProviders).catch(() => setProviders([]));
  }, [open]);

  const overrideProviderInfo = providers.find((p) => p.id === providerOverride);
  const overrideModels = overrideProviderInfo?.supportedModels ?? [];

  // Calculate recommended card count based on content length and density
  const calculateMinCards = (contentLength: number, density: string): number => {
    // Base: 1 card per X characters
    // auto: 600, sparse: 1000, dense: 400
    const charsPerCard = density === "sparse" ? 1000 : density === "dense" ? 400 : 600;
    const calculated = Math.floor(contentLength / charsPerCard);
    // Clamp between 3 and 100
    return Math.max(3, Math.min(100, calculated));
  };

  const selectedSource = knowledgeSources.find((s) => s.id === selectedSourceId);
  const estimatedCards = selectedSource
    ? calculateMinCards(selectedSource.content.length, cardDensity)
    : 0;

  useEffect(() => {
    if (open) {
      setSelectedSourceId("");
      setCardCount("5");
      setComprehensiveMode(false);
      setCardDensity("auto");
      setGeneratedCards([]);
      setStep("select");
      setIsGenerating(false);
      setError(null);
      setGenerationStats(null);
    }
  }, [open]);

  // Auto-enable comprehensive mode for long content
  useEffect(() => {
    if (selectedSourceId) {
      const source = knowledgeSources.find((s) => s.id === selectedSourceId);
      if (source && source.content.length > 3000) {
        setComprehensiveMode(true);
      }
    }
  }, [selectedSourceId, knowledgeSources]);

  const generateCards = async () => {
    const source = knowledgeSources.find((s) => s.id === selectedSourceId);
    if (!source) return;

    setIsGenerating(true);
    setStep("generating");
    setError(null);
    setGenerationStats(null);

    try {
      let cards: GeneratedCard[];

      const override = providerOverride
        ? { provider: providerOverride, model: modelOverride || undefined }
        : undefined;

      if (comprehensiveMode) {
        // Use FractoP for comprehensive generation
        const minCards = calculateMinCards(source.content.length, cardDensity);
        const response = await generateCardsComprehensive({
          content: source.content,
          deckId,
          deckName: deckName || source.name,
          minCards,
          override,
        });

        cards = response.cards.map((card) => ({
          question: card.question,
          answer: card.answer,
          selected: true,
          editing: false,
        }));

        setGenerationStats(response.stats);
      } else {
        // Use simple generation
        const response = await generateCardsApi({
          content: source.content,
          deckId,
          deckName: deckName || source.name,
          cardCount: parseInt(cardCount),
          override,
        });

        cards = response.cards.map((card) => ({
          question: card.question,
          answer: card.answer,
          selected: true,
          editing: false,
        }));
      }

      setGeneratedCards(cards);
      setStep("review");
    } catch (err) {
      console.error('Card generation error:', err);
      setError(err instanceof Error ? err.message : 'カード生成に失敗しました');
      setStep("select");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleCardSelection = (index: number) => {
    setGeneratedCards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, selected: !card.selected } : card
      )
    );
  };

  const toggleAllCards = () => {
    const allSelected = generatedCards.every((card) => card.selected);
    setGeneratedCards((prev) =>
      prev.map((card) => ({ ...card, selected: !allSelected }))
    );
  };

  const startEditing = (index: number) => {
    setGeneratedCards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, editing: true } : card
      )
    );
  };

  const cancelEditing = (index: number) => {
    setGeneratedCards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, editing: false } : card
      )
    );
  };

  const saveEdit = (index: number, question: string, answer: string) => {
    setGeneratedCards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, question, answer, editing: false } : card
      )
    );
  };

  const handleAddCards = () => {
    const selectedCards = generatedCards
      .filter((card) => card.selected)
      .map(({ question, answer }) => ({ question, answer }));
    
    if (selectedCards.length > 0) {
      onGenerate(selectedCards);
      onClose();
    }
  };

  const selectedCount = generatedCards.filter((card) => card.selected).length;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#4A90E2]" />
            知識ソースからカードを生成
          </DialogTitle>
          <DialogDescription>
            AIが知識ソースの内容を解析し、学習カードを自動生成します。
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4 py-4">
            {error && (
              <Card className="p-4 bg-red-50 border-red-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">エラーが発生しました</p>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              </Card>
            )}
            <div className="space-y-2">
              <Label htmlFor="source-select">知識ソース</Label>
              <Select value={selectedSourceId} onValueChange={setSelectedSourceId}>
                <SelectTrigger id="source-select">
                  <SelectValue placeholder="知識ソースを選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {knowledgeSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name} ({source.content.length.toLocaleString()}{" "}
                      文字)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-[#E8E8E8] bg-[#F9FAFB]">
                <Checkbox
                  id="comprehensive-mode"
                  checked={comprehensiveMode}
                  onCheckedChange={(checked) => setComprehensiveMode(checked === true)}
                />
                <div className="flex-1">
                  <Label htmlFor="comprehensive-mode" className="cursor-pointer flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#4A90E2]" />
                    網羅モード（FractoP）
                  </Label>
                  <p className="text-xs text-[#7F8C8D] mt-0.5">
                    長いコンテンツを分割して網羅的にカードを生成
                  </p>
                </div>
              </div>

              {/* AIプロバイダ単発オーバーライド */}
              <div className="space-y-2 p-3 rounded-lg border border-dashed border-[#E8E8E8]">
                <Label className="flex items-center gap-2 text-xs text-[#7F8C8D]">
                  <Sparkles className="w-3 h-3" />
                  AIプロバイダ(この生成だけ)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={providerOverride || "__default__"}
                    onValueChange={(v) => {
                      const next = v === "__default__" ? "" : v;
                      setProviderOverride(next);
                      const info = providers.find((p) => p.id === next);
                      setModelOverride(info?.defaultModel ?? "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">デフォルト(設定)</SelectItem>
                      {providers
                        .filter((p) => p.id !== "stub")
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                            {p.available ? "" : " · 未接続"}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={modelOverride || "__provider_default__"}
                    onValueChange={(v) => setModelOverride(v === "__provider_default__" ? "" : v)}
                    disabled={!providerOverride}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="モデル" />
                    </SelectTrigger>
                    <SelectContent>
                      {providerOverride && (
                        <SelectItem value="__provider_default__">
                          自動 ({overrideProviderInfo?.defaultModel})
                        </SelectItem>
                      )}
                      {overrideModels.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {providerOverride && !overrideProviderInfo?.available && (
                  <p className="text-[11px] text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {overrideProviderInfo?.name}は未接続。失敗するかstubに退避します。
                  </p>
                )}
              </div>

              {comprehensiveMode ? (
                <div className="space-y-2">
                  <Label htmlFor="card-density">カード密度</Label>
                  <Select value={cardDensity} onValueChange={setCardDensity}>
                    <SelectTrigger id="card-density">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">お任せ</SelectItem>
                      <SelectItem value="sparse">控えめ</SelectItem>
                      <SelectItem value="dense">しっかり</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedSource && (
                    <p className="text-xs text-[#4A90E2]">
                      {selectedSource.content.length.toLocaleString()}文字 → 約{estimatedCards}枚
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="card-count">生成枚数</Label>
                  <Select value={cardCount} onValueChange={setCardCount}>
                    <SelectTrigger id="card-count">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3枚</SelectItem>
                      <SelectItem value="5">5枚</SelectItem>
                      <SelectItem value="10">10枚</SelectItem>
                      <SelectItem value="15">15枚</SelectItem>
                      <SelectItem value="20">20枚</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {selectedSourceId && (
              <Card className="p-4 bg-gradient-to-r from-[#4A90E2]/5 to-[#50C878]/5 border-[#4A90E2]/20">
                <p className="text-sm text-[#2C3E50] mb-2">
                  <span className="text-[#4A90E2]">プレビュー:</span>
                </p>
                <p className="text-xs text-[#7F8C8D] line-clamp-3">
                  {
                    knowledgeSources.find((s) => s.id === selectedSourceId)
                      ?.content
                  }
                </p>
              </Card>
            )}
          </div>
        )}

        {step === "generating" && (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-[#4A90E2] animate-spin" />
            <p className="text-sm text-[#7F8C8D]">
              {comprehensiveMode
                ? "FractoPでコンテンツを分析中...（数分かかる場合があります）"
                : "AIがカードを生成中です..."}
            </p>
            {comprehensiveMode && (
              <p className="text-xs text-[#95A5A6]">
                コンテンツをチャンクに分割 → 各チャンクからカード抽出 → 重複排除
              </p>
            )}
          </div>
        )}

        {step === "review" && (
          <div className="flex flex-col gap-4 min-h-0">
            {generationStats && (
              <Card className="p-3 bg-[#4A90E2]/5 border-[#4A90E2]/20 flex-shrink-0">
                <div className="flex items-center gap-4 text-xs text-[#7F8C8D]">
                  <Layers className="w-4 h-4 text-[#4A90E2]" />
                  <span>{generationStats.chunks}チャンクを分析</span>
                  <span>→</span>
                  <span>{generationStats.totalExtracted}枚抽出</span>
                  <span>→</span>
                  <span className="text-[#4A90E2] font-medium">{generatedCards.length}枚（重複排除後）</span>
                </div>
              </Card>
            )}
            <div className="flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={generatedCards.every((card) => card.selected)}
                  onCheckedChange={toggleAllCards}
                />
                <Label htmlFor="select-all" className="cursor-pointer">
                  全て選択 ({selectedCount}/{generatedCards.length})
                </Label>
              </div>
            </div>

            <div className="overflow-y-auto pr-2" style={{ maxHeight: "400px" }}>
              <div className="space-y-3">
                {generatedCards.map((card, index) => (
                  <GeneratedCardItem
                    key={index}
                    card={card}
                    index={index}
                    onToggle={() => toggleCardSelection(index)}
                    onEdit={() => startEditing(index)}
                    onCancelEdit={() => cancelEditing(index)}
                    onSaveEdit={(question, answer) => saveEdit(index, question, answer)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "select" && (
            <>
              <Button variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button
                onClick={generateCards}
                disabled={!selectedSourceId || isGenerating}
                className="bg-[#4A90E2] hover:bg-[#357ABD] text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                カードを生成
              </Button>
            </>
          )}
          {step === "review" && (
            <>
              <Button variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button
                onClick={handleAddCards}
                disabled={selectedCount === 0}
                className="bg-[#50C878] hover:bg-[#45B369] text-white"
              >
                {selectedCount}枚のカードを追加
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
