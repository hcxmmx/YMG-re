"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/lib/store";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings } = useSettingsStore();
  const [apiKey, setApiKey] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [enableStreaming, setEnableStreaming] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  // 加载已保存的设置
  useEffect(() => {
    setApiKey(settings.apiKey || "");
    setTemperature(settings.temperature);
    setMaxTokens(settings.maxTokens);
    setEnableStreaming(settings.enableStreaming);
  }, [settings]);

  // 保存设置
  const handleSave = () => {
    updateSettings({
      apiKey,
      temperature,
      maxTokens,
      enableStreaming,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">设置</h1>
        <p className="text-muted-foreground">配置您的AI对话平台</p>
      </header>

      <div className="space-y-8">
        {/* API密钥设置 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">API密钥</h2>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              您需要提供一个有效的Gemini API密钥才能使用此应用
            </p>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入您的Gemini API密钥"
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground">
              <a
                href="https://ai.google.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                点击这里
              </a>{" "}
              获取Gemini API密钥
            </p>
          </div>
        </div>

        {/* 生成设置 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">生成设置</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 温度设置 */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="temperature" className="text-sm font-medium">
                  温度: {temperature}
                </label>
                <span className="text-sm text-muted-foreground">
                  {temperature < 0.3
                    ? "更精确"
                    : temperature > 0.7
                    ? "更有创意"
                    : "平衡"}
                </span>
              </div>
              <input
                id="temperature"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                控制响应的随机性。较低的值使响应更加一致和确定，较高的值使响应更加多样化和创意。
              </p>
            </div>

            {/* 最大令牌数 */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="maxTokens" className="text-sm font-medium">
                  最大输出长度: {maxTokens}
                </label>
              </div>
              <input
                id="maxTokens"
                type="range"
                min="256"
                max="4096"
                step="256"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                控制生成响应的最大长度。较高的值允许更长的回复，但可能增加API成本。
              </p>
            </div>

            {/* 流式响应 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  id="streaming"
                  type="checkbox"
                  checked={enableStreaming}
                  onChange={(e) => setEnableStreaming(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="streaming" className="text-sm font-medium">
                  启用流式响应
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                启用后，AI回复将逐字显示，提供更自然的体验。禁用后，将在完成后一次性显示整个回复。
              </p>
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-between pt-4">
          <Button onClick={() => router.back()} variant="outline">
            返回
          </Button>
          <div className="flex items-center gap-4">
            {isSaved && (
              <span className="text-sm text-green-500">设置已保存</span>
            )}
            <Button onClick={handleSave}>保存设置</Button>
          </div>
        </div>
      </div>
    </div>
  );
} 