import { getRequestHeaders } from '@sillytavern/script';
import { getContext } from '@sillytavern/scripts/st-context';
import { uuidv4 } from '@sillytavern/scripts/utils';

export function import_character(filename: string, content: Blob): Promise<Response> {
  const file = new File([content], filename, { type: 'image/png' });

  const from_data = new FormData();
  from_data.append('avatar', file);
  from_data.append('file_type', 'png');
  from_data.append('preserved_name', file.name);

  const headers = getRequestHeaders();
  _.unset(headers, 'Content-Type');
  return fetch('/api/characters/import', {
    method: 'POST',
    headers: headers,
    body: from_data,
    cache: 'no-cache',
  });
}

export function import_preset(filename: string, content: string): Promise<Response> {
  const response = fetch(`/api/presets/save-openai?name=${filename.replace(/\.[^/.]+$/, '')}`, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: content,
  }).then(result => {
    $('#settings_preset_openai')[0].dispatchEvent(new Event('change'));
    return result;
  });
  return response;
}

export function import_lorebook(filename: string, content: string): Promise<Response> {
  const file = new File([content], filename, { type: 'application/json' });

  const formData = new FormData();
  formData.append('avatar', file);

  const headers = getRequestHeaders();
  _.unset(headers, 'Content-Type');
  return fetch(`/api/worldinfo/import`, {
    method: 'POST',
    headers: headers,
    body: formData,
  });
}

export function import_regex(_filename: string, content: string): void {
  const json = JSON.parse(content);
  json.id = uuidv4();

  const context = getContext();
  context.extensionSettings.regex.push(json);
  context.saveSettingsDebounced();
}
