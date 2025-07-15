import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings } from './types';
import { HarmBlockThreshold } from './types';

// 用户设置存储
interface SettingsState {
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        theme: 'system',
        language: 'zh-CN',
        enableStreaming: true,
        maxTokens: 1024,
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        model: 'gemini-2.5-pro',
        safetySettings: {
          hateSpeech: HarmBlockThreshold.BLOCK_NONE,
          harassment: HarmBlockThreshold.BLOCK_NONE,
          sexuallyExplicit: HarmBlockThreshold.BLOCK_NONE,
          dangerousContent: HarmBlockThreshold.BLOCK_NONE,
        },
      },
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
    }),
    {
      name: 'ai-roleplay-settings',
    }
  )
); 