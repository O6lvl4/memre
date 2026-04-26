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

interface FlashCard {
  id: string;
  question: string;
  answer: string;
}

interface CardDialogProps {
  open: boolean;
  card?: FlashCard | null;
  onClose: () => void;
  onSave: (card: Omit<FlashCard, "id"> & { id?: string }) => void;
}

export function CardDialog({ open, card, onClose, onSave }: CardDialogProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    if (card) {
      setQuestion(card.question);
      setAnswer(card.answer);
    } else {
      setQuestion("");
      setAnswer("");
    }
  }, [card, open]);

  const handleSave = () => {
    if (!question.trim() || !answer.trim()) return;

    onSave({
      id: card?.id,
      question: question.trim(),
      answer: answer.trim(),
    });

    setQuestion("");
    setAnswer("");
    onClose();
  };

  const handleClose = () => {
    setQuestion("");
    setAnswer("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {card ? "カードを編集" : "新しいカードを作成"}
          </DialogTitle>
          <DialogDescription>
            {card
              ? "カードの内容を編集できます。"
              : "問題と答えを入力してカードを作成します。"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-2">
            <Label htmlFor="question">問題</Label>
            <Textarea
              id="question"
              placeholder="例：大腿骨の英語名は？"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="answer">答え</Label>
            <Textarea
              id="answer"
              placeholder="例：Femur（フィーマー）"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            キャンセル
          </Button>
          <Button
            onClick={handleSave}
            disabled={!question.trim() || !answer.trim()}
            className="bg-[#4A90E2] hover:bg-[#357ABD] text-white"
          >
            {card ? "保存" : "作成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
