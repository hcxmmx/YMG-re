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
    version: "1.1.0",
    releaseDate: "2024-01-15", 
    title: "重大功能升级",
    features: [
      "预设系统全面重构，支持SillyTavern深度参数",
      "角色卡导入兼容性大幅提升",
      "API密钥使用次数管理：支持手动清除和每日自动重置",
      "虚拟滚动技术：解决长对话卡顿问题"
    ],
    fixes: [
      "修复从其他页面返回聊天时滚动到顶部的问题", 
      "修复角色卡导入时SillyTavern兼容字段丢失的问题",
      "修复200条消息后滚动卡顿的性能问题"
    ],
    improvements: [
      "聊天界面性能优化，支持1000+条消息流畅滚动",
      "优化了消息构建系统架构",
      "完善了数据存储的向后兼容性"
    ]
  }
  // 未来版本会添加到这里
];

// 获取当前应用版本（从package.json读取）
export function getCurrentVersion(): string {
  // 在实际应用中，这个值会在构建时注入
  return process.env.NEXT_PUBLIC_VERSION || "1.1.0";
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
