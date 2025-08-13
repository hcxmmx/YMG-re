import { registerMacroLike } from '@/component/macrolike';
import { builtin } from '@/function/builtin';
import {
  Character,
  getCharAvatarPath,
  getCharData,
  getChatHistoryBrief,
  getChatHistoryDetail,
} from '@/function/character';
import {
  createChatMessages,
  deleteChatMessages,
  getChatMessages,
  rotateChatMessages,
  setChatMessage,
  setChatMessages,
} from '@/function/chat_message';
import { formatAsDisplayedMessage, retrieveDisplayedMessage } from '@/function/displayed_message';
import { generate, generateRaw } from '@/function/generate';
import { builtin_prompt_default_order } from '@/function/generate/types';
import {
  createLorebook,
  deleteLorebook,
  getCharLorebooks,
  getChatLorebook,
  getCurrentCharPrimaryLorebook,
  getLorebooks,
  getLorebookSettings,
  getOrCreateChatLorebook,
  setChatLorebook,
  setCurrentCharLorebooks,
  setLorebookSettings,
} from '@/function/lorebook';
import {
  createLorebookEntries,
  createLorebookEntry,
  deleteLorebookEntries,
  deleteLorebookEntry,
  getLorebookEntries,
  replaceLorebookEntries,
  setLorebookEntries,
  updateLorebookEntriesWith,
} from '@/function/lorebook_entry';
import {
  createOrReplacePreset,
  createPreset,
  default_preset,
  deletePreset,
  getLoadedPresetName,
  getPreset,
  getPresetNames,
  isPresetNormalPrompt,
  isPresetPlaceholderPrompt,
  isPresetSystemPrompt,
  loadPreset,
  renamePreset,
  replacePreset,
  setPreset,
  updatePresetWith,
} from '@/function/preset';
import { appendInexistentScriptButtons, getScriptButtons, replaceScriptButtons } from '@/function/script_repository';
import { triggerSlash } from '@/function/slash';
import {
  formatAsTavernRegexedString,
  getTavernRegexes,
  isCharacterTavernRegexesEnabled,
  replaceTavernRegexes,
  updateTavernRegexesWith,
} from '@/function/tavern_regex';
import { errorCatched, getLastMessageId, substitudeMacros } from '@/function/util';
import {
  deleteVariable,
  getVariables,
  insertOrAssignVariables,
  insertVariables,
  replaceVariables,
  updateVariablesWith,
} from '@/function/variables';
import { getTavernHelperVersion, updateTavernHelper } from '@/function/version';
import {
  createOrReplaceWorldbook,
  createWorldbook,
  deleteWorldbook,
  getCharWorldbookNames,
  getChatWorldbookName,
  getGlobalWorldbookNames,
  getOrCreateChatWorldbook,
  getWorldbook,
  getWorldbookNames,
  rebindCharWorldbooks,
  rebindChatWorldbook,
  rebindGlobalWorldbooks,
  replaceWorldbook,
  updateWorldbookWith,
} from '@/function/worldbook';
import { audioEnable, audioImport, audioMode, audioPlay, audioSelect } from '@/slash_command/audio';

function getTavernHelper() {
  return {
    // audio
    audioEnable,
    audioImport,
    audioMode,
    audioPlay,
    audioSelect,

    // builtin
    builtin,

    // character
    Character,
    getCharData,
    getCharAvatarPath,
    getChatHistoryBrief,
    getChatHistoryDetail,

    // chat_message
    getChatMessages,
    setChatMessages,
    setChatMessage,
    createChatMessages,
    deleteChatMessages,
    rotateChatMessages,

    // displayed_message
    formatAsDisplayedMessage,
    retrieveDisplayedMessage,

    // generate
    builtin_prompt_default_order,
    generate,
    generateRaw,

    // lorebook_entry
    getLorebookEntries,
    replaceLorebookEntries,
    updateLorebookEntriesWith,
    setLorebookEntries,
    createLorebookEntries,
    createLorebookEntry,
    deleteLorebookEntries,
    deleteLorebookEntry,

    // lorebook
    getLorebookSettings,
    setLorebookSettings,
    getCharLorebooks,
    setCurrentCharLorebooks,
    getLorebooks,
    deleteLorebook,
    createLorebook,
    getCurrentCharPrimaryLorebook,
    getChatLorebook,
    setChatLorebook,
    getOrCreateChatLorebook,

    // preset
    isPresetNormalPrompt,
    isPresetSystemPrompt,
    isPresetPlaceholderPrompt,
    default_preset,
    getPresetNames,
    getLoadedPresetName,
    loadPreset,
    createPreset,
    createOrReplacePreset,
    deletePreset,
    renamePreset,
    getPreset,
    replacePreset,
    updatePresetWith,
    setPreset,

    // macrolike
    registerMacroLike,

    // slash
    triggerSlash,
    triggerSlashWithResult: triggerSlash,

    // tavern_regex
    formatAsTavernRegexedString,
    isCharacterTavernRegexesEnabled,
    getTavernRegexes,
    replaceTavernRegexes,
    updateTavernRegexesWith,

    // util
    substitudeMacros,
    getLastMessageId,
    errorCatched,

    // variables
    getVariables,
    replaceVariables,
    updateVariablesWith,
    insertOrAssignVariables,
    deleteVariable,
    insertVariables,

    // script_repository
    getScriptButtons,
    replaceScriptButtons,
    appendInexistentScriptButtons,

    // version
    getTavernHelperVersion,
    updateTavernHelper,
    getFrontendVersion: getTavernHelperVersion,
    updateFrontendVersion: updateTavernHelper,

    // worldbook
    getWorldbookNames,
    getGlobalWorldbookNames,
    rebindGlobalWorldbooks,
    getCharWorldbookNames,
    rebindCharWorldbooks,
    getChatWorldbookName,
    rebindChatWorldbook,
    getOrCreateChatWorldbook,
    createWorldbook,
    createOrReplaceWorldbook,
    deleteWorldbook,
    getWorldbook,
    replaceWorldbook,
    updateWorldbookWith,
  };
}

declare namespace globalThis {
  let TavernHelper: ReturnType<typeof getTavernHelper>;
}

/**
 * 初始化TavernHelper全局对象
 * 将各种功能函数暴露到全局作用域
 */
export function initTavernHelperObject() {
  globalThis.TavernHelper = getTavernHelper();
}
