import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Upload, FileText } from "lucide-react";

interface KnowledgeSource {
  id: string;
  name: string;
  content: string;
  type: "text" | "file";
}

interface KnowledgeSourceDialogProps {
  open: boolean;
  source?: KnowledgeSource | null;
  onClose: () => void;
  onSave: (source: Omit<KnowledgeSource, "id"> & { id?: string }) => void;
}

export function KnowledgeSourceDialog({
  open,
  source,
  onClose,
  onSave,
}: KnowledgeSourceDialogProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"text" | "file">("text");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (source) {
      setName(source.name);
      setContent(source.content);
      setType(source.type);
      if (source.type === "file") {
        setFileName(source.name);
      }
    } else {
      setName("");
      setContent("");
      setType("text");
      setFileName("");
    }
  }, [source, open]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // File size limit: 1MB
    if (file.size > 1024 * 1024) {
      alert("ファイルサイズは1MB以下にしてください");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContent(text);
      setFileName(file.name);
      if (!name) {
        setName(file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleSave = () => {
    if (!name.trim() || !content.trim()) return;

    onSave({
      id: source?.id,
      name: name.trim(),
      content: content.trim(),
      type,
    });

    setName("");
    setContent("");
    setType("text");
    setFileName("");
    onClose();
  };

  const handleClose = () => {
    setName("");
    setContent("");
    setType("text");
    setFileName("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {source ? "知識ソースを編集" : "知識ソースを追加"}
          </DialogTitle>
          <DialogDescription>
            参考資料やドキュメントを追加します。AIがこの情報をもとに、より適切な追加問題を生成します。
          </DialogDescription>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v: any) => setType(v)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">
              <FileText className="w-4 h-4 mr-2" />
              テキスト入力
            </TabsTrigger>
            <TabsTrigger value="file" disabled={!!source}>
              <Upload className="w-4 h-4 mr-2" />
              ファイルアップロード
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="source-name">タイトル</Label>
              <Input
                id="source-name"
                placeholder="例：教科書 第3章、参考論文、学習ガイド"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-content">内容</Label>
              <Textarea
                id="source-content"
                placeholder="参考資料の内容を入力してください。この情報をもとにAIが問題を生成します。"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[300px] resize-none font-mono text-sm"
              />
              <p className="text-xs text-[#7F8C8D]">
                {content.length.toLocaleString()} 文字
              </p>
            </div>
          </TabsContent>

          <TabsContent value="file" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="source-name-file">タイトル</Label>
              <Input
                id="source-name-file"
                placeholder="ファイル名から自動入力されます"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>ファイル</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#4A90E2]/30 rounded-lg p-8 text-center cursor-pointer hover:border-[#4A90E2] hover:bg-[#4A90E2]/5 transition-colors"
              >
                <Upload className="w-12 h-12 mx-auto mb-3 text-[#4A90E2]" />
                <p className="text-sm text-[#2C3E50] mb-1">
                  {fileName || "クリックしてファイルを選択"}
                </p>
                <p className="text-xs text-[#7F8C8D]">
                  テキストファイル (.txt, .md) / 最大 1MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.text"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {content && (
              <div className="space-y-2">
                <Label>プレビュー</Label>
                <div className="bg-[#FAFAFA] rounded-lg p-4 max-h-[200px] overflow-y-auto">
                  <pre className="text-xs text-[#2C3E50] whitespace-pre-wrap font-mono">
                    {content.slice(0, 500)}
                    {content.length > 500 && "..."}
                  </pre>
                </div>
                <p className="text-xs text-[#7F8C8D]">
                  {content.length.toLocaleString()} 文字
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            キャンセル
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || !content.trim()}
            className="bg-[#4A90E2] hover:bg-[#357ABD] text-white"
          >
            {source ? "保存" : "追加"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
