import { saveSettingsDebounced } from '@sillytavern/script';
import { power_user } from '@sillytavern/scripts/power-user';

function toggle_if_not_allowed(setting: string, expected: boolean): boolean {
  if (_.get(power_user, setting) === expected) {
    return false;
  }

  _.set(power_user, setting, expected);
  $(`#${setting}`).prop('checked', expected);
  return true;
}

export function disableIncompatibleOption() {
  if (
    ['auto_fix_generated_markdown', 'trim_sentences', 'forbid_external_media', 'encode_tags']
      .map(setting => toggle_if_not_allowed(setting, false))
      .some(is_changed => !!is_changed)
  ) {
    saveSettingsDebounced();
  }
}
