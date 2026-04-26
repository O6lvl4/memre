import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings as Cog, X, Check, Eye, EyeOff } from "lucide-react";
import { listProviders, type ProviderInfo } from "../lib/api";
import { settingsApi, type SettingsSnapshot } from "../lib/settings";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function SettingsDialog({ open, onClose, onSaved }: Props) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [snap, setSnap] = useState<SettingsSnapshot>({
    defaultProvider: "ollama",
    defaultModel: "",
    anthropicApiKey: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([listProviders(), settingsApi.get()])
      .then(([ps, s]) => {
        setProviders(ps);
        setSnap({
          defaultProvider: s.defaultProvider || "ollama",
          defaultModel: s.defaultModel || "",
          anthropicApiKey: s.anthropicApiKey || "",
        });
      })
      .catch((e) => toast.error("設定の取得に失敗しました: " + (e?.message ?? e)))
      .finally(() => setLoading(false));
  }, [open]);

  const current = providers.find((p) => p.id === snap.defaultProvider);
  const models = current?.supportedModels ?? [];

  async function save() {
    setSaving(true);
    try {
      const finalModel = snap.defaultModel || current?.defaultModel || "";
      await settingsApi.set({ ...snap, defaultModel: finalModel });
      toast.success("設定を保存しました(再起動で反映)");
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error("保存に失敗: " + (e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 backdrop-blur-sm fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-[560px] max-w-[92vw] max-h-[90vh] overflow-y-auto">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Cog className="size-4 text-indigo-500" />
            AIプロバイダ設定
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md p-1"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-sm text-gray-400">読み込み中…</div>
          ) : (
            <>
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  デフォルトプロバイダ
                </h3>
                <div className="grid gap-2">
                  {providers
                    .filter((p) => p.id !== "stub")
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setSnap((s) => ({
                            ...s,
                            defaultProvider: p.id,
                            defaultModel: p.defaultModel,
                          }))
                        }
                        className={
                          "text-left rounded-xl border p-3 transition-all " +
                          (snap.defaultProvider === p.id
                            ? "border-indigo-400 bg-indigo-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50")
                        }
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900 text-sm">
                            {p.name}
                          </span>
                          <span
                            className={
                              "text-[10px] px-2 py-0.5 rounded-full " +
                              (p.available
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-gray-100 text-gray-500")
                            }
                          >
                            {p.available ? "接続OK" : "未接続"}
                          </span>
                          {snap.defaultProvider === p.id && (
                            <Check className="size-4 text-indigo-600 ml-2" />
                          )}
                        </div>
                        {p.note && (
                          <div className="text-xs text-gray-500 mt-1.5">{p.note}</div>
                        )}
                      </button>
                    ))}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  モデル
                </h3>
                <select
                  value={snap.defaultModel || current?.defaultModel || ""}
                  onChange={(e) =>
                    setSnap((s) => ({ ...s, defaultModel: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                >
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </section>

              {snap.defaultProvider === "anthropic" && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                    Anthropic API キー
                  </h3>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={snap.anthropicApiKey}
                      onChange={(e) =>
                        setSnap((s) => ({ ...s, anthropicApiKey: e.target.value }))
                      }
                      placeholder="sk-ant-api03-…"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-9 text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
                    >
                      {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    キーはローカルSQLite (~/Library/Application Support/Memre/memre.db)
                    に保存されます。アプリ外には送信しません。
                  </p>
                </section>
              )}

              {snap.defaultProvider === "claudecode" && (
                <section className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
                  Claude Code CLI(<code>/opt/homebrew/bin/claude</code> など)を経由してSonnetなどを呼びます。
                  Anthropicの認証はCLIに委譲、追加のAPI keyは不要です。
                </section>
              )}
            </>
          )}
        </div>

        <footer className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100"
          >
            キャンセル
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </footer>
      </div>
    </div>
  );
}
