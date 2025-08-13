import { reloadEditor, reloadEditorDebounced } from '@/compatibility';
import { addOneMessage, saveSettings } from '@sillytavern/script';

export const builtin = {
  addOneMessage,
  saveSettings,
  reloadEditor,
  reloadEditorDebounced,
};
