import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from './utils';
import type { Profile, Dialog, Message, UserSettings } from './types';
import { createDefaultProfiles } from './default-profiles';

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

// 角色配置存储
interface ProfilesState {
  profiles: Profile[];
  currentProfileId: string | null;
  addProfile: (profile: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProfile: (id: string, profile: Partial<Profile>) => void;
  deleteProfile: (id: string) => void;
  setCurrentProfile: (id: string | null) => void;
  initDefaultProfiles: () => void;
}

export const useProfilesStore = create<ProfilesState>()(
  persist(
    (set, get) => ({
      profiles: [],
      currentProfileId: null,
      addProfile: (profile) =>
        set((state) => ({
          profiles: [
            ...state.profiles,
            {
              ...profile,
              id: generateId(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        })),
      updateProfile: (id, updatedProfile) =>
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === id
              ? { ...profile, ...updatedProfile, updatedAt: new Date() }
              : profile
          ),
        })),
      deleteProfile: (id) =>
        set((state) => ({
          profiles: state.profiles.filter((profile) => profile.id !== id),
        })),
      setCurrentProfile: (id) =>
        set(() => ({
          currentProfileId: id,
        })),
      initDefaultProfiles: () => {
        const { profiles } = get();
        if (profiles.length === 0) {
          const defaultProfiles = createDefaultProfiles();
          set({ profiles: defaultProfiles });
          if (defaultProfiles.length > 0) {
            set({ currentProfileId: defaultProfiles[0].id });
          }
        }
      },
    }),
    {
      name: 'ai-roleplay-profiles',
    }
  )
);

// 对话历史存储
interface ChatsState {
  dialogs: Dialog[];
  currentDialogId: string | null;
  addDialog: (dialog: Omit<Dialog, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateDialog: (id: string, dialog: Partial<Dialog>) => void;
  deleteDialog: (id: string) => void;
  setCurrentDialog: (id: string | null) => void;
  addMessage: (dialogId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
}

export const useChatsStore = create<ChatsState>()(
  persist(
    (set) => ({
      dialogs: [],
      currentDialogId: null,
      addDialog: (dialog) => {
        const id = generateId();
        set((state) => ({
          dialogs: [
            ...state.dialogs,
            {
              ...dialog,
              id,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          currentDialogId: id,
        }));
        return id;
      },
      updateDialog: (id, updatedDialog) =>
        set((state) => ({
          dialogs: state.dialogs.map((dialog) =>
            dialog.id === id
              ? { ...dialog, ...updatedDialog, updatedAt: new Date() }
              : dialog
          ),
        })),
      deleteDialog: (id) =>
        set((state) => ({
          dialogs: state.dialogs.filter((dialog) => dialog.id !== id),
          currentDialogId: state.currentDialogId === id ? null : state.currentDialogId,
        })),
      setCurrentDialog: (id) =>
        set(() => ({
          currentDialogId: id,
        })),
      addMessage: (dialogId, message) =>
        set((state) => ({
          dialogs: state.dialogs.map((dialog) =>
            dialog.id === dialogId
              ? {
                  ...dialog,
                  messages: [
                    ...dialog.messages,
                    {
                      ...message,
                      id: generateId(),
                      timestamp: new Date(),
                    },
                  ],
                  updatedAt: new Date(),
                }
              : dialog
          ),
        })),
    }),
    {
      name: 'ai-roleplay-chats',
    }
  )
); 