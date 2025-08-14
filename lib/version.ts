// 版本管理和更新检查系统

export interface VersionInfo {
  version: string;
  releaseDate: string;
  title: string;
  features: string[];
  fixes: string[];
  improvements: string[];
}

// 更新日志 - 按版本倒序排列（最新版本在前）
export const CHANGELOG: VersionInfo[] = [
  {
    version: "1.3.0",
    releaseDate: "2025-08-14",
    title: "批量管理功能全面升级",
    features: [
      "新增角色批量管理功能，支持多选操作和批量删除",
      "新增玩家批量管理功能，提高管理效率",
      "新增世界书批量管理功能，轻松管理大量世界书",
      "新增预设批量管理功能，快速整理预设库",
      "聊天界面编辑框全面优化，提升输入体验"
    ],
    fixes: [
      "修复批量操作时的性能问题",
      "修复编辑框在某些情况下的显示异常",
      "优化批量选择的用户体验"
    ],
    improvements: [
      "统一批量管理界面设计，操作更加直观",
      "优化聊天编辑框的响应性和流畅度",
      "提升批量操作的执行效率",
      "完善批量管理的错误处理机制"
    ]
  }
  // 未来版本会添加到这里
];

// 获取当前应用版本（从package.json读取）
export function getCurrentVersion(): string {
  // 在实际应用中，这个值会在构建时注入
  return process.env.NEXT_PUBLIC_VERSION || "1.3.0";
}

// 获取本地存储的版本
export function getStoredVersion(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('app_version');
}

// 存储版本信息
export function setStoredVersion(version: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('app_version', version);
}

// 检查是否有新版本
export function hasNewVersion(): boolean {
  const currentVersion = getCurrentVersion();
  const storedVersion = getStoredVersion();
  
  // 如果没有存储版本，说明是第一次使用
  if (!storedVersion) {
    return false;
  }
  
  // 简单的版本比较
  return compareVersions(currentVersion, storedVersion) > 0;
}

// 版本比较函数 (简化版，支持 x.y.z 格式)
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}

// 获取版本的更新日志
export function getVersionChangelog(version: string): VersionInfo | undefined {
  return CHANGELOG.find(log => log.version === version);
}

// 获取最新版本的更新日志
export function getLatestChangelog(): VersionInfo | undefined {
  return CHANGELOG[0];
}

// 标记更新日志已读
export function markChangelogRead(version: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`changelog_read_${version}`, 'true');
}

// 检查更新日志是否已读
export function isChangelogRead(version: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(`changelog_read_${version}`) === 'true';
}
