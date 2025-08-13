import {
  getCurrentVersion,
  updateTavernHelper as updateTavernHelperImpl,
  VERSION_FILE_PATH,
} from '@/util/check_update';

export async function getTavernHelperVersion(): Promise<string> {
  const currentVersion = await getCurrentVersion(VERSION_FILE_PATH);
  if (typeof currentVersion !== 'string') {
    throw new Error('获取的版本号无效');
  }
  return currentVersion;
}

export async function updateTavernHelper() {
  return updateTavernHelperImpl();
}
