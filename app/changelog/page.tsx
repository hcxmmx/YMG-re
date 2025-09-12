"use client";

import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHANGELOG, getCurrentVersion } from "@/lib/version";
import { CalendarDays, Sparkles, CheckCircle, AlertTriangle, Zap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ChangelogPage() {
  const currentVersion = getCurrentVersion();

  // 设置页面标题
  useEffect(() => {
    document.title = "更新日志";
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">更新日志</h1>
            </div>
          </div>
          <Badge variant="outline" className="text-sm">
            当前版本 v{currentVersion}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          查看应用的版本更新历史和新功能介绍
        </p>
      </div>

      <div className="space-y-6">
        {CHANGELOG.map((version, index) => (
          <Card key={version.version} className={`${version.version === currentVersion ? 'border-primary shadow-md' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl">v{version.version}</CardTitle>
                  {version.version === currentVersion && (
                    <Badge className="text-xs">当前版本</Badge>
                  )}
                  {index === 0 && version.version !== currentVersion && (
                    <Badge variant="secondary" className="text-xs">最新版本</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  {version.releaseDate}
                </div>
              </div>
              <CardDescription className="text-base font-medium text-foreground">
                {version.title}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 新功能 */}
              {version.features.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <h4 className="font-medium text-blue-700 dark:text-blue-300">新功能</h4>
                    <Badge variant="outline" className="text-xs text-blue-600">
                      {version.features.length}
                    </Badge>
                  </div>
                  <div className="grid gap-2 pl-6">
                    {version.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 问题修复 */}
              {version.fixes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <h4 className="font-medium text-green-700 dark:text-green-300">问题修复</h4>
                    <Badge variant="outline" className="text-xs text-green-600">
                      {version.fixes.length}
                    </Badge>
                  </div>
                  <div className="grid gap-2 pl-6">
                    {version.fixes.map((fix, fixIndex) => (
                      <div key={fixIndex} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="leading-relaxed">{fix}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 改进优化 */}
              {version.improvements.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <h4 className="font-medium text-orange-700 dark:text-orange-300">改进优化</h4>
                    <Badge variant="outline" className="text-xs text-orange-600">
                      {version.improvements.length}
                    </Badge>
                  </div>
                  <div className="grid gap-2 pl-6">
                    {version.improvements.map((improvement, improvementIndex) => (
                      <div key={improvementIndex} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="leading-relaxed">{improvement}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 空状态或提示信息 */}
      {CHANGELOG.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无更新日志</h3>
            <p className="text-muted-foreground">
              更新日志将在有新版本发布时显示
            </p>
          </CardContent>
        </Card>
      )}

      {/* 底部信息 */}
      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          有问题或建议？欢迎在 Discord 上反馈
        </p>
      </div>
    </div>
  );
}
