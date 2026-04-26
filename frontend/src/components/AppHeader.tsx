import { useEffect, useState } from "react";
import { Layers, Sparkles, AlertCircle, Settings as Cog } from "lucide-react";
import { getAIStatus, type AIStatus } from "../lib/api";
import { SettingsDialog } from "./SettingsDialog";

export function AppHeader() {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const probe = () => {
    getAIStatus()
      .then((s) => setStatus(s))
      .catch(() => setStatus(null));
  };

  useEffect(() => {
    probe();
    const t = setInterval(probe, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <header
      className="w-full border-b border-[#E8E8E8] bg-white"
      style={{ position: "sticky", top: 0, zIndex: 50 }}
    >
      <div
        className="max-w-4xl mx-auto flex items-center justify-between"
        style={{ padding: "var(--space-sm) var(--space-md)", height: "56px" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center text-white">
            <Layers className="w-4 h-4" />
          </div>
          <span
            className="text-[#2C3E50]"
            style={{ fontSize: "var(--text-xl)", fontWeight: "bold" }}
          >
            MemRE
          </span>
          <span className="ml-2 text-[10px] uppercase tracking-widest text-gray-400">
            desktop
          </span>
        </div>

        <div className="flex items-center gap-2">
          <AIBadge status={status} />
          <button
            onClick={() => setSettingsOpen(true)}
            className="size-8 rounded-full grid place-items-center text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition"
            aria-label="settings"
            title="AIプロバイダ設定"
          >
            <Cog className="size-4" />
          </button>
        </div>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={probe}
      />
    </header>
  );
}

function AIBadge({ status }: { status: AIStatus | null }) {
  if (!status) {
    return (
      <span className="text-xs text-gray-400 inline-flex items-center gap-1">
        <span className="size-1.5 rounded-full bg-gray-300 animate-pulse" />
        AI接続確認中…
      </span>
    );
  }
  if (status.connected && status.modelInstalled) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1"
        title={status.baseUrl}
      >
        <Sparkles className="w-3 h-3" />
        <span className="font-medium">{status.model}</span>
        <span className="text-emerald-500">●</span>
      </span>
    );
  }
  if (status.connected && !status.modelInstalled) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1"
        title={status.error || ""}
      >
        <AlertCircle className="w-3 h-3" />
        <span className="font-medium">{status.model} 未取得</span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1"
      title={status.error || "AIプロバイダ未接続: ローカルstubで動作中"}
    >
      <span className="size-1.5 rounded-full bg-gray-400" />
      stub mode
    </span>
  );
}
