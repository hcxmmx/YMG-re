import { world_names } from '@sillytavern/scripts/world-info';

/**
 * Reloads the editor with the specified world info file
 * @param file The file to load in the editor
 * @param loadIfNotSelected Indicates whether to load the file even if it's not currently selected
 */
export function reloadEditor(file: string, load_if_not_selected: boolean = false) {
  const current_index = Number($('#world_editor_select').val());
  const selected_index = world_names.indexOf(file);
  if (selected_index !== -1 && (load_if_not_selected || current_index === selected_index)) {
    $('#world_editor_select').val(selected_index).trigger('change');
  }
}

export const reloadEditorDebounced = _.debounce(reloadEditor, 1000);

export const settingsToUpdate = {
  max_context_unlocked: ['#oai_max_context_unlocked', 'max_context_unlocked', true, false],
  openai_max_context: ['#openai_max_context', 'openai_max_context', false, false],
  openai_max_tokens: ['#openai_max_tokens', 'openai_max_tokens', false, false],
  n: ['#n_openai', 'n', false, false],

  stream_openai: ['#stream_toggle', 'stream_openai', true, false],

  temperature: ['#temp_openai', 'temp_openai', false, false],
  frequency_penalty: ['#freq_pen_openai', 'freq_pen_openai', false, false],
  presence_penalty: ['#pres_pen_openai', 'pres_pen_openai', false, false],
  top_p: ['#top_p_openai', 'top_p_openai', false, false],
  repetition_penalty: ['#repetition_penalty_openai', 'repetition_penalty_openai', false, false],
  min_p: ['#min_p_openai', 'min_p_openai', false, false],
  top_k: ['#top_k_openai', 'top_k_openai', false, false],
  top_a: ['#top_a_openai', 'top_a_openai', false, false],

  seed: ['#seed_openai', 'seed', false, false],

  squash_system_messages: ['#squash_system_messages', 'squash_system_messages', true, false],

  reasoning_effort: ['#openai_reasoning_effort', 'reasoning_effort', false, false],
  show_thoughts: ['#openai_show_thoughts', 'show_thoughts', true, false],
  request_images: ['#openai_request_images', 'request_images', true, false],
  function_calling: ['#openai_function_calling', 'function_calling', true, false],
  enable_web_search: ['#openai_enable_web_search', 'enable_web_search', true, false],

  image_inlining: ['#openai_image_inlining', 'image_inlining', true, false],
  inline_image_quality: ['#openai_inline_image_quality', 'inline_image_quality', false, false],
  video_inlining: ['#openai_video_inlining', 'video_inlining', true, false],

  names_behavior: ['#names_behavior', 'names_behavior', false, false],
  wrap_in_quotes: ['#wrap_in_quotes', 'wrap_in_quotes', true, false],

  prompts: ['', 'prompts', false, false],
  prompt_order: ['', 'prompt_order', false, false],

  extensions: ['#NULL_SELECTOR', 'extensions', false, false],
};
