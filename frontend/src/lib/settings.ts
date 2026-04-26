import { WailsHandler as SettingsService } from "../../bindings/github.com/O6lvl4/memre/internal/settings";

export interface SettingsSnapshot {
  defaultProvider: string;
  defaultModel: string;
  anthropicApiKey: string;
}

export const settingsApi = {
  get: async (): Promise<SettingsSnapshot> => {
    const s = (await SettingsService.Get()) as any;
    return {
      defaultProvider: s.defaultProvider ?? "",
      defaultModel: s.defaultModel ?? "",
      anthropicApiKey: s.anthropicApiKey ?? "",
    };
  },
  set: async (s: SettingsSnapshot): Promise<void> => {
    await SettingsService.Set(s as any);
  },
};
