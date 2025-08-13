import * as CORE from '@gitbeaker/core';
import YAML from 'yaml';
import { Gitlab } from '@gitbeaker/rest';

export interface Repository_path {
  host: string;
  project_id: string;
  path: string;
  ref: string;
}

export function parse_repository_path_from_url(url: string): Repository_path {
  const match = url.match(/(https?:\/\/[^/]+)\/((?:[^/]+)\/(?:[^/]+))\/-\/(?:tree|blob)\/([^/]+)\/([^?]*)/);
  if (!match) {
    throw Error(`解析仓库文件 url 失败: 未能从 '${url}' 中解析出 gitlab 仓库文件信息`);
  }
  return {
    host: match[1],
    project_id: match[2],
    path: match[4],
    ref: match[3],
  };
}

/**
 *
 * @param api
 * @param file {}
 * @returns
 */
export async function retrieve_raw(api: CORE.Gitlab, file: Repository_path): Promise<Blob | string> {
  return await api.RepositoryFiles.showRaw(file.project_id, file.path, file.ref);
}

export interface Data_config {
  name: string;
  characters: string[];
  lorebooks: string[];
  presets: string[];
  regexes: string[];
}

export async function retrieve_data_config(api: CORE.Gitlab, file: Repository_path): Promise<Data_config> {
  const raw = await retrieve_raw(api, file);
  if (typeof raw !== 'string') {
    throw Error(`解析数据配置失败: 配置文件内容应该是纯文本`);
  }

  let data: {
    名称: string;
    角色卡?: string[];
    世界书?: string[];
    预设?: string[];
    正则?: string[];
  };
  try {
    data = YAML.parse(raw);
  } catch (_error) {
    throw Error(`解析数据配置失败: 配置文件内容不符合 yaml 格式\n\n${raw}`);
  }

  return {
    name: data.名称,
    characters: data.角色卡 ?? [],
    lorebooks: data.世界书 ?? [],
    presets: data.预设 ?? [],
    regexes: data.正则 ?? [],
  };
}

export async function compare_commits_between(api: CORE.Gitlab, project_id: string, from_ref: string, to_ref: string) {
  const result = await api.Repositories.compare(project_id, from_ref, to_ref);
  alert(JSON.stringify(result));
}

export interface Entry_config {
  config_file: Repository_path;
  token?: string;
}

export function make_api(entry_config: Entry_config): CORE.Gitlab {
  return new Gitlab({ host: entry_config.config_file.host, token: entry_config.token });
}
