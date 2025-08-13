import { settingsToUpdate } from '@/compatibility';
import { saveSettingsDebounced } from '@sillytavern/script';
import { oai_settings, promptManager } from '@sillytavern/scripts/openai';
import { getPresetManager } from '@sillytavern/scripts/preset-manager';
import { uuidv4 } from '@sillytavern/scripts/utils';
import { LiteralUnion, PartialDeep, SetRequired } from 'type-fest';

type Preset = {
  settings: {
    max_context: number;
    max_completion_tokens: number;
    reply_count: number;

    should_stream: boolean;

    temperature: number;
    frequency_penalty: number;
    presence_penalty: number;
    repetition_penalty: number;
    top_p: number;
    min_p: number;
    top_k: number;
    top_a: number;

    seed: number;

    squash_system_messages: boolean;

    reasoning_effort: 'auto' | 'min' | 'low' | 'medium' | 'high' | 'max';
    request_thoughts: boolean;
    request_images: boolean;
    enable_function_calling: boolean;
    enable_web_search: boolean;

    allow_sending_images: 'disabled' | 'auto' | 'low' | 'high';
    allow_sending_videos: boolean;

    character_name_prefix: 'none' | 'default' | 'content' | 'completion';
    wrap_user_messages_in_quotes: boolean;
  };

  prompts: PresetPrompt[];
  prompts_unused: PresetPrompt[];

  extensions: Record<string, any>;
};

type PresetPrompt = {
  id: LiteralUnion<
    | 'main'
    | 'nsfw'
    | 'jailbreak'
    | 'enhance_definitions'
    | 'world_info_before'
    | 'persona_description'
    | 'char_description'
    | 'char_personality'
    | 'scenario'
    | 'world_info_after'
    | 'dialogue_examples'
    | 'chat_history',
    string
  >;
  name: string;
  enabled: boolean;

  position?: 'relative' | number;

  role: 'system' | 'user' | 'assistant';
  content?: string;

  extra?: Record<string, any>;
};
type PresetNormalPrompt = SetRequired<{ id: string } & Omit<PresetPrompt, 'id'>, 'position' | 'content'>;
type PresetSystemPrompt = SetRequired<
  { id: 'main' | 'nsfw' | 'jailbreak' | 'enhance_definitions' } & Omit<PresetPrompt, 'id'>,
  'content'
>;
type PresetPlaceholderPrompt = SetRequired<
  {
    id:
      | 'world_info_before'
      | 'persona_description'
      | 'char_description'
      | 'char_personality'
      | 'scenario'
      | 'world_info_after'
      | 'dialogue_examples'
      | 'chat_history';
  } & Omit<PresetPrompt, 'id'>,
  'position'
>;
export function isPresetNormalPrompt(prompt: PresetPrompt): prompt is PresetNormalPrompt {
  return !isPresetSystemPrompt(prompt) && !isPresetPlaceholderPrompt(prompt);
}
export function isPresetSystemPrompt(prompt: PresetPrompt): prompt is PresetSystemPrompt {
  return ['main', 'nsfw', 'jailbreak', 'enhance_definitions'].includes(prompt.id);
}
export function isPresetPlaceholderPrompt(prompt: PresetPrompt): prompt is PresetPlaceholderPrompt {
  return [
    'world_info_before',
    'persona_description',
    'char_description',
    'char_personality',
    'scenario',
    'world_info_after',
    'dialogue_examples',
    'chat_history',
  ].includes(prompt.id);
}

export const default_preset: Preset = {
  settings: {
    max_context: 2000000,
    max_completion_tokens: 300,
    reply_count: 1,

    should_stream: false,

    temperature: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    repetition_penalty: 1,
    top_p: 1,
    min_p: 0,
    top_k: 0,
    top_a: 0,

    seed: -1,

    squash_system_messages: false,

    reasoning_effort: 'auto',
    request_thoughts: false,
    request_images: false,
    enable_function_calling: false,
    enable_web_search: false,

    allow_sending_images: 'disabled',
    allow_sending_videos: false,

    character_name_prefix: 'none',
    wrap_user_messages_in_quotes: false,
  },
  prompts: [
    { id: 'world_info_before', name: 'World Info (before)', enabled: true, position: 'relative', role: 'system' },
    { id: 'persona_description', name: 'Persona Description', enabled: true, position: 'relative', role: 'system' },
    { id: 'char_description', name: 'Char Description', enabled: true, position: 'relative', role: 'system' },
    { id: 'char_personality', name: 'Char Personality', enabled: true, position: 'relative', role: 'system' },
    { id: 'scenario', name: 'Scenario', enabled: true, position: 'relative', role: 'system' },
    { id: 'world_info_after', name: 'World Info (after)', enabled: true, position: 'relative', role: 'system' },
    { id: 'dialogue_examples', name: 'Chat Examples', enabled: true, position: 'relative', role: 'system' },
    { id: 'chat_history', name: 'Chat History', enabled: true, position: 'relative', role: 'system' },
  ],
  prompts_unused: [],
  extensions: {},
} as const;

const in_use_map = {
  temp_openai: 'temperature',
  freq_pen_openai: 'frequency_penalty',
  pres_pen_openai: 'presence_penalty',
  top_p_openai: 'top_p',
  repetition_penalty_openai: 'repetition_penalty',
  min_p_openai: 'min_p',
  top_k_openai: 'top_k',
  top_a_openai: 'top_a',
} as const;
type _OriginalPreset = {
  max_context_unlocked: boolean;
  openai_max_context: number;
  openai_max_tokens: number;
  n: number;

  stream_openai: boolean;

  // vv in use vv
  temp_openai: number;
  freq_pen_openai: number;
  pres_pen_openai: number;
  top_p_openai: number;
  repetition_penalty_openai: number;
  min_p_openai: number;
  top_k_openai: number;
  top_a_openai: number;
  // vv in file vv
  temperature: number;
  frequency_penalty: number;
  presence_penalty: number;
  top_p: number;
  repetition_penalty: number;
  min_p: number;
  top_k: number;
  top_a: number;

  seed: number;

  squash_system_messages: boolean;

  reasoning_effort: 'auto' | 'min' | 'low' | 'medium' | 'high' | 'max';
  show_thoughts: boolean;
  request_images: boolean;
  function_calling: boolean;
  enable_web_search: boolean;

  image_inlining: boolean;
  inline_image_quality: 'auto' | 'low' | 'high';
  video_inlining: boolean;

  names_behavior: -1 | 0 | 2 | 1;
  wrap_in_quotes: boolean;

  prompts: _OriginalPrompt[];
  prompt_order: Array<{
    character_id: 100001;
    order: _OriginalPromptOrder[];
  }>;

  extensions: Record<string, any>;
};
type _OriginalPromptOrder = {
  identifier: string;
  enabled: boolean;
};
type _OriginalPrompt = _OriginalNormalPrompt | _OriginalSystemPrompt | _OriginalPlaceholderPrompt;
type _OriginalNormalPrompt = {
  identifier: string;
  name: string;
  enabled?: boolean;

  injection_position: 0 | 1;
  injection_depth: number;

  role: 'system' | 'user' | 'assistant';
  content: string;

  system_prompt: false;
  marker: false;

  extra?: Record<string, any>;

  forbid_overrides: false;
};
type _OriginalSystemPrompt = {
  identifier: 'main' | 'nsfw' | 'jailbreak' | 'enhanceDefinitions';
  name: string;
  enabled?: boolean;

  role: 'system' | 'user' | 'assistant';
  content: string;

  system_prompt: true;
  marker: false;

  extra?: Record<string, any>;

  forbid_overrides: false;
};
type _OriginalPlaceholderPrompt = {
  identifier:
    | 'worldInfoBefore'
    | 'personaDescription'
    | 'charDescription'
    | 'charPersonality'
    | 'scenario'
    | 'worldInfoAfter'
    | 'dialogueExamples'
    | 'chatHistory';
  name: string;
  enabled?: boolean;

  injection_position: 0 | 1;
  injection_depth: number;

  role: 'system' | 'user' | 'assistant';

  system_prompt: true;
  marker: true;

  extra?: Record<string, any>;
};
const identifier_to_id_map = {
  enhanceDefinitions: 'enhance_definitions',
  worldInfoBefore: 'world_info_before',
  personaDescription: 'persona_description',
  charDescription: 'char_description',
  charPersonality: 'char_personality',
  scenario: 'scenario',
  worldInfoAfter: 'world_info_after',
  dialogueExamples: 'dialogue_examples',
  chatHistory: 'chat_history',
} as const;
function toPresetPrompt(prompt: _OriginalPrompt, prompt_order: _OriginalPromptOrder[]): PresetPrompt {
  const is_normal_prompt = prompt.system_prompt === false && prompt.marker === false;
  const is_system_prompt = prompt.system_prompt === true && prompt.marker === false;
  const is_placeholder_prompt = prompt.marker === true;

  let result = _({})
    .set('id', _.get(identifier_to_id_map, prompt.identifier, prompt.identifier) ?? uuidv4())
    .set('name', prompt.name ?? 'unnamed')
    .set(
      'enabled',
      prompt_order.find(order => order.identifier === prompt.identifier)
        ?.enabled ??
        prompt.enabled ??
        true,
    );

  if (is_normal_prompt || is_placeholder_prompt) {
    result = result.set(
      'position',
      (
        {
          0: 'relative',
          1: prompt.injection_depth ?? 4,
        } as const
      )[prompt.injection_position ?? 0],
    );
  }
  result = result.set('role', prompt.role ?? 'system');

  if (is_normal_prompt || is_system_prompt) {
    result = result.set('content', prompt.content ?? '');
  }

  if (prompt.extra) {
    result = result.set('extra', prompt.extra);
  }

  return result.value() as PresetPrompt;
}
function fromPresetPrompt(prompt: PresetPrompt): _OriginalPrompt {
  const is_normal_prompt = isPresetNormalPrompt(prompt);
  const is_system_prompt = isPresetSystemPrompt(prompt);
  const is_placeholder_prompt = isPresetPlaceholderPrompt(prompt);

  let result = _({})
    .set(
      'identifier',
      _.get(
        {
          enhance_definitions: 'enhanceDefinitions',
          world_info_before: 'worldInfoBefore',
          persona_description: 'personaDescription',
          char_description: 'charDescription',
          char_personality: 'charPersonality',
          scenario: 'scenario',
          world_info_after: 'worldInfoAfter',
          dialogue_examples: 'dialogueExamples',
          chat_history: 'chatHistory',
        } as const,
        prompt.id,
        prompt.id,
      ),
    )
    .set('name', prompt.name)
    .set('enabled', prompt.enabled);

  if ((is_normal_prompt || is_placeholder_prompt) && !['dialogue_examples', 'chat_history'].includes(prompt.id)) {
    result = result
      .set('injection_position', prompt.position === 'relative' ? 0 : 1)
      .set('injection_depth', prompt.position === 'relative' ? 4 : prompt.position);
  }

  result = result.set('role', prompt.role);
  if (is_normal_prompt || is_system_prompt) {
    result = result.set('content', prompt.content);
  }

  result = result.set('system_prompt', is_system_prompt && is_placeholder_prompt).set('marker', is_placeholder_prompt);

  if (prompt.extra) {
    result = result.set('extra', prompt.extra);
  }

  result = result.set('forbid_overrides', false);

  return result.value() as _OriginalPrompt;
}

function toPreset(preset: _OriginalPreset, { in_use }: { in_use: boolean }): Preset {
  const prompt_order = preset.prompt_order.find(order => order.character_id === 100001)?.order ?? [];
  const prompts_all = preset.prompts.map(prompt => toPresetPrompt(prompt, prompt_order));

  const prompt_order_identifiers = prompt_order.map(order =>
    _.get(identifier_to_id_map, order.identifier, order.identifier),
  );
  const [prompts_used, prompts_unused] = _.partition(prompts_all, prompt =>
    prompt_order_identifiers.includes(prompt.id),
  );
  const prompts = prompt_order_identifiers.map(identifier => prompts_used.find(prompt => prompt.id === identifier)!);

  return {
    settings: {
      max_context: preset.openai_max_context,
      max_completion_tokens: preset.openai_max_tokens,
      reply_count: preset.n,

      should_stream: preset.stream_openai,

      temperature: in_use ? preset.temp_openai : preset.temperature,
      frequency_penalty: in_use ? preset.freq_pen_openai : preset.frequency_penalty,
      presence_penalty: in_use ? preset.pres_pen_openai : preset.presence_penalty,
      top_p: in_use ? preset.top_p_openai : preset.top_p,
      repetition_penalty: in_use ? preset.repetition_penalty_openai : preset.repetition_penalty,
      min_p: in_use ? preset.min_p_openai : preset.min_p,
      top_k: in_use ? preset.top_k_openai : preset.top_k,
      top_a: in_use ? preset.top_a_openai : preset.top_a,

      seed: preset.seed,

      squash_system_messages: preset.squash_system_messages,

      reasoning_effort: preset.reasoning_effort,
      request_thoughts: preset.show_thoughts,
      request_images: preset.request_images,
      enable_function_calling: preset.function_calling,
      enable_web_search: preset.enable_web_search,

      allow_sending_images: preset.image_inlining === false ? 'disabled' : preset.inline_image_quality,
      allow_sending_videos: preset.video_inlining,

      character_name_prefix: (
        {
          [-1]: 'none',
          [0]: 'default',
          [2]: 'content',
          [1]: 'completion',
        } as const
      )[preset.names_behavior],
      wrap_user_messages_in_quotes: preset.wrap_in_quotes,
    },

    prompts,
    prompts_unused,

    extensions: preset.extensions,
  };
}
function fromPreset(preset: Preset): _OriginalPreset {
  const id_set = new Set<string>();
  const handle_id_collision = (id: string, is_normal_prompt: boolean): string => {
    if (!id_set.has(id)) {
      id_set.add(id);
      return id;
    }
    if (!is_normal_prompt) {
      throw Error(`修改的预设中存在重复的系统/占位提示词 '${id}'`);
    }
    const new_id = uuidv4();
    id_set.add(new_id);
    return new_id;
  };
  preset.prompts.forEach(prompt => (prompt.id = handle_id_collision(prompt.id, isPresetNormalPrompt(prompt))));

  const prompt_used = preset.prompts.map(prompt => fromPresetPrompt(prompt));
  const prompt_unused = preset.prompts_unused.map(prompt => fromPresetPrompt(prompt));

  return {
    max_context_unlocked: true,
    openai_max_context: preset.settings.max_context,
    openai_max_tokens: preset.settings.max_completion_tokens,
    n: preset.settings.reply_count,

    stream_openai: preset.settings.should_stream,

    // vv in use vv
    temp_openai: preset.settings.temperature,
    freq_pen_openai: preset.settings.frequency_penalty,
    pres_pen_openai: preset.settings.presence_penalty,
    top_p_openai: preset.settings.top_p,
    repetition_penalty_openai: preset.settings.repetition_penalty,
    min_p_openai: preset.settings.min_p,
    top_k_openai: preset.settings.top_k,
    top_a_openai: preset.settings.top_a,
    // vv in file vv
    temperature: preset.settings.temperature,
    frequency_penalty: preset.settings.frequency_penalty,
    presence_penalty: preset.settings.presence_penalty,
    top_p: preset.settings.top_p,
    repetition_penalty: preset.settings.repetition_penalty,
    min_p: preset.settings.min_p,
    top_k: preset.settings.top_k,
    top_a: preset.settings.top_a,

    seed: preset.settings.seed,

    squash_system_messages: preset.settings.squash_system_messages,

    reasoning_effort: preset.settings.reasoning_effort,
    show_thoughts: preset.settings.request_thoughts,
    request_images: preset.settings.request_images,
    function_calling: preset.settings.enable_function_calling,
    enable_web_search: preset.settings.enable_web_search,

    image_inlining: preset.settings.allow_sending_images !== 'disabled',
    inline_image_quality:
      preset.settings.allow_sending_images === 'disabled' ? 'auto' : preset.settings.allow_sending_images,
    video_inlining: preset.settings.allow_sending_videos,

    names_behavior: (
      {
        none: -1,
        default: 0,
        content: 2,
        completion: 1,
      } as const
    )[preset.settings.character_name_prefix],
    wrap_in_quotes: preset.settings.wrap_user_messages_in_quotes,

    prompts: [...prompt_used, ...prompt_unused],
    prompt_order: [
      {
        character_id: 100001,
        order: prompt_used.map(prompt => ({ identifier: prompt.identifier, enabled: prompt.enabled ?? true })),
      },
    ],

    extensions: preset.extensions,
  };
}

const preset_manager = getPresetManager('openai');

export function getPresetNames(): string[] {
  return structuredClone(['in_use', ...preset_manager.getAllPresets()]);
}

export function getLoadedPresetName(): string {
  return preset_manager.getSelectedPresetName();
}

export function loadPreset(preset_name: Exclude<string, 'in_use'>): boolean {
  const preset_value = preset_manager.findPreset(preset_name);
  if (!preset_value) {
    return false;
  }
  preset_manager.selectPreset(preset_value);
  return true;
}

export async function createPreset(
  preset_name: Exclude<string, 'in_use'>,
  preset: Preset = default_preset,
): Promise<boolean> {
  if (getPresetNames().includes(preset_name)) {
    return false;
  }
  await createOrReplacePreset(preset_name, preset);
  return true;
}

function updateOriginalPresetData(
  data: Record<string, any>,
  updates: _OriginalPreset,
  { in_use }: { in_use: boolean },
): void {
  (Object.entries(settingsToUpdate) as [keyof _OriginalPreset, [string, string, boolean, boolean]][]).forEach(
    ([key, [selector, setting, is_checkbox, is_connection]]) => {
      if (is_connection) {
        return;
      }

      _.set(data, in_use ? setting : _.get(in_use_map, setting, setting), updates[key]);

      if (!in_use) {
        return;
      }

      if (['extensions', 'prompts', 'prompt_order'].includes(key)) {
        return;
      }
      if (is_checkbox) {
        $(selector)
          .prop('checked', updates[key] as boolean)
          .trigger('input', { source: 'preset' });
      } else {
        $(selector)
          .val(updates[key] as string | number)
          .trigger('input', { source: 'preset' });
      }
    },
  );

  if (in_use) {
    saveSettingsDebounced();
    promptManager.renderDebounced();
  }
}
export async function createOrReplacePreset(
  preset_name: LiteralUnion<'in_use', string>,
  preset: Preset = default_preset,
): Promise<boolean> {
  const original_preset = fromPreset(preset);

  const is_existing = getPresetNames().includes(preset_name);
  if (!is_existing) {
    const { presets, preset_names } = preset_manager.getPresetList();
    presets.push(original_preset);
    (preset_names as Record<string, number>)[preset_name] = presets.length - 1;
    preset_manager.select.append(
      $('<option></option>', { value: presets.length - 1, text: preset_name, selected: false }),
    );
  } else {
    updateOriginalPresetData(
      preset_name === 'in_use' ? oai_settings : preset_manager.getCompletionPresetByName(preset_name),
      original_preset,
      {
        in_use: preset_name === 'in_use',
      },
    );
  }

  if (preset_name !== 'in_use') {
    await preset_manager.savePreset(preset_name, preset_manager.getCompletionPresetByName(preset_name), {
      skipUpdate: true,
    });
  }

  return !is_existing;
}

export async function deletePreset(preset_name: Exclude<string, 'in_use'>): Promise<boolean> {
  return Boolean(await preset_manager.deletePreset(preset_name));
}

export async function renamePreset(preset_name: Exclude<string, 'in_use'>, new_name: string): Promise<boolean> {
  if (!getPresetNames().includes(preset_name)) {
    return false;
  }
  await createPreset(new_name, getPreset(preset_name)!);
  await deletePreset(preset_name);
  return true;
}

export function getPreset(preset_name: LiteralUnion<'in_use', string>): Preset {
  const original_preset =
    preset_name === 'in_use' ? oai_settings : preset_manager.getCompletionPresetByName(preset_name);
  if (!original_preset) {
    throw Error(`预设 '${preset_name}' 不存在`);
  }
  return structuredClone(toPreset(original_preset, { in_use: preset_name === 'in_use' }));
}

export async function replacePreset(preset_name: LiteralUnion<'in_use', string>, preset: Preset): Promise<void> {
  if (!getPresetNames().includes(preset_name)) {
    throw Error(`预设 '${preset_name}' 不存在`);
  }
  await createOrReplacePreset(preset_name, preset);
}

type PresetUpdater = ((preset: Preset) => Preset) | ((preset: Preset) => Promise<Preset>);

export async function updatePresetWith(
  preset_name: LiteralUnion<'in_use', string>,
  updater: PresetUpdater,
): Promise<Preset> {
  if (!getPresetNames().includes(preset_name)) {
    throw Error(`预设 '${preset_name}' 不存在`);
  }
  const preset = await updater(getPreset(preset_name)!);
  await replacePreset(preset_name, preset);
  return preset;
}

export async function setPreset(
  preset_name: LiteralUnion<'in_use', string>,
  preset: PartialDeep<Preset>,
): Promise<Preset> {
  return await updatePresetWith(preset_name, old_preset => {
    return {
      settings: _.defaultsDeep(preset.settings, old_preset.settings),
      prompts: preset.prompts ?? old_preset.prompts,
      prompts_unused: preset.prompts_unused ?? old_preset.prompts_unused,
      extensions: _.defaultsDeep(preset.extensions, old_preset.extensions),
    };
  });
}
