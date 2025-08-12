"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  getCurrentVersion, 
  getStoredVersion, 
  setStoredVersion, 
  hasNewVersion, 
  getLatestChangelog,
  markChangelogRead,
  isChangelogRead,
  type VersionInfo 
} from "@/lib/version";
import { Sparkles, CheckCircle, AlertTriangle, Zap } from "lucide-react";

export function VersionUpdateNotification() {
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkForUpdates = () => {
      const currentVersion = getCurrentVersion();
      const storedVersion = getStoredVersion();
      
      // 如果是第一次使用，直接存储当前版本
      if (!storedVersion) {
        setStoredVersion(currentVersion);
        return;
      }
      
      // 检查是否有新版本
      if (hasNewVersion()) {
        const changelog = getLatestChangelog();
        if (changelog && !isChangelogRead(currentVersion)) {
          setUpdateInfo(changelog);
          
          // 显示简单的Toast通知
          toast({
            title: "🎉 应用已更新",
            description: `欢迎使用 v${currentVersion}，点击查看更新内容`,
            action: (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowUpdateDialog(true)}
              >
                查看详情
              </Button>
            )
          });
          
          // 延迟3秒后自动打开详细对话框（如果用户没有手动关闭Toast）
          setTimeout(() => {
            setShowUpdateDialog(true);
          }, 3000);
        }
        
        // 更新存储的版本号
        setStoredVersion(currentVersion);
      }
    };

    // 页面加载后检查更新
    const timer = setTimeout(checkForUpdates, 1000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleCloseDialog = () => {
    setShowUpdateDialog(false);
    if (updateInfo) {
      markChangelogRead(updateInfo.version);
    }
  };

  if (!updateInfo) return null;

  return (
    <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>应用更新 v{updateInfo.version}</DialogTitle>
            <Badge variant="secondary" className="text-xs">
              {updateInfo.releaseDate}
            </Badge>
          </div>
          <DialogDescription>
            {updateInfo.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 新功能 */}
          {updateInfo.features.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                <h4 className="font-medium text-blue-700 dark:text-blue-300">新功能</h4>
              </div>
              <ul className="space-y-2 pl-6">
                {updateInfo.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 问题修复 */}
          {updateInfo.fixes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <h4 className="font-medium text-green-700 dark:text-green-300">问题修复</h4>
              </div>
              <ul className="space-y-2 pl-6">
                {updateInfo.fixes.map((fix, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    <span>{fix}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 改进优化 */}
          {updateInfo.improvements.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <h4 className="font-medium text-orange-700 dark:text-orange-300">改进优化</h4>
              </div>
              <ul className="space-y-2 pl-6">
                {updateInfo.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 感谢信息 */}
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground text-center">
              感谢使用我们的应用！如有问题或建议，欢迎反馈。
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleCloseDialog} className="w-full">
            我知道了
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
