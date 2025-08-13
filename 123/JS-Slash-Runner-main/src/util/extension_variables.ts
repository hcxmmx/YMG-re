// TODO: 为设置变量添加类型而非使用 any
import { characters, getThumbnailUrl, saveSettingsDebounced, this_chid, user_avatar } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const extensionName = 'JS-Slash-Runner';
export const extensionSettingName = 'TavernHelper';

export const extensionFolderPath = `third-party/${extensionName}`;

// 获取头像原图
export const charsPath = '/characters/';
export const getUserAvatarPath = () => `./User Avatars/${user_avatar}`;
export const getCharAvatarPath = () => {
  //@ts-ignore
  const thumbnailPath = getThumbnailUrl('avatar', characters[this_chid]?.avatar || characters[this_chid]?.name || '');
  const targetAvatarImg = thumbnailPath.substring(thumbnailPath.lastIndexOf('=') + 1);
  return charsPath + targetAvatarImg;
};

/**
 * 获取扩展设置变量的值
 *
 * @param path 设置变量的键
 * @param default_value 没有该键时的默认值
 * @returns 设置变量的值
 */
export function getSettingValue(path: string, default_value: any = undefined): any {
  // @ts-ignore
  return _.get(extension_settings[extensionSettingName], path, default_value);
}

/**
 * 保存扩展设置变量的值
 *
 * @param path 设置变量的键
 * @param value 设置变量的值
 * @returns 设置变量的值
 */
export function saveSettingValue<T>(path: string, value: T): T {
  // @ts-ignore
  _.set(extension_settings[extensionSettingName], path, value);
  saveSettingsDebounced();
  return value;
}

/**
 * 如果扩展有某设置变量，则返回该设置变量的值，否则设置该设置变量的值为 `default_value`
 *
 * @param path 设置变量的键
 * @param default_value 扩展没有该设置变量时应该设置并返回的默认值
 * @returns 设置变量的值
 */
export async function getOrSaveSettingValue<T>(path: string, default_value: T): Promise<T> {
  // @ts-ignore
  if (_.has(extension_settings[extensionSettingName], path)) {
    return getSettingValue(path);
  }
  return saveSettingValue(path, default_value);
}
