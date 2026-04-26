import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface DeckInput {
  name: string;
  color: string;
  description?: string;
  id?: string;
}

interface DeckDialogProps {
  open: boolean;
  deck?: { id: string; name: string; color: string; description?: string } | null;
  onClose: () => void;
  onSave: (deck: DeckInput) => void;
}

const PRESET_COLORS = [
  "#4A90E2",
  "#50C878",
  "#FF6B6B",
  "#FFD93D",
  "#9B59B6",
  "#E67E22",
  "#1ABC9C",
  "#E91E63",
];

export function DeckDialog({ open, deck, onClose, onSave }: DeckDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (deck) {
      setName(deck.name);
      setColor(deck.color);
      setDescription(deck.description || "");
    } else {
      setName("");
      setColor(PRESET_COLORS[0]);
      setDescription("");
    }
  }, [deck, open]);

  const handleSave = () => {
    if (!name.trim()) return;

    onSave({
      id: deck?.id,
      name: name.trim(),
      color,
      description: description.trim(),
    });

    setName("");
    setColor(PRESET_COLORS[0]);
    setDescription("");
    onClose();
  };

  const handleClose = () => {
    setName("");
    setColor(PRESET_COLORS[0]);
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {deck ? "デッキを編集" : "新しいデッキを作成"}
          </DialogTitle>
          <DialogDescription>
            デッキの基本情報を設定します。学習資料は後から「知識ソース」として追加できます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="deck-name">デッキ名</Label>
            <Input
              id="deck-name"
              placeholder="例：TOEIC 頻出単語"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deck-description">
              説明
              <span className="text-xs text-[#7F8C8D] ml-2">(任意)</span>
            </Label>
            <Textarea
              id="deck-description"
              placeholder="例：TOEIC 800点を目指すビジネス英単語集"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>カラー</Label>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className="w-10 h-10 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: presetColor,
                    border:
                      color === presetColor
                        ? "3px solid #2C3E50"
                        : "2px solid transparent",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-[#FAFAFA] rounded-lg">
            <p className="text-xs text-[#7F8C8D] mb-2">プレビュー</p>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-[#2C3E50]">
                {name || "デッキ名"}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            キャンセル
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="bg-[#4A90E2] hover:bg-[#357ABD] text-white"
          >
            {deck ? "保存" : "作成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
