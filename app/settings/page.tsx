"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/lib/store";
import { HarmBlockThreshold } from "@/lib/types";
import Link from "next/link";

// 可用的Gemini模型列表
const AVAILABLE_MODELS = [
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro - 高级功能" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash - 快速响应" },
];

// 安全设置阈值选项
const SAFETY_THRESHOLD_OPTIONS = [
  { value: HarmBlockThreshold.BLOCK_NONE, label: "不阻止" },
  { value: HarmBlockThreshold.BLOCK_ONLY_HIGH, label: "仅阻止高风险" },
  { value: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE, label: "阻止中等及以上风险" },
  { value: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE, label: "阻止低等及以上风险" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings } = useSettingsStore();
  const [apiKey, setApiKey] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [topK, setTopK] = useState(40);
  const [topP, setTopP] = useState(0.95);
  const [model, setModel] = useState("gemini-2.5-pro");
  const [enableStreaming, setEnableStreaming] = useState(true);
  const [safetySettings, setSafetySettings] = useState({
    hateSpeech: HarmBlockThreshold.BLOCK_NONE,
    harassment: HarmBlockThreshold.BLOCK_NONE,
    sexuallyExplicit: HarmBlockThreshold.BLOCK_NONE,
    dangerousContent: HarmBlockThreshold.BLOCK_NONE,
  });
  const [isSaved, setIsSaved] = useState(false);

  // 加载已保存的设置
  useEffect(() => {
    setApiKey(settings.apiKey || "");
    setTemperature(settings.temperature);
    setMaxTokens(settings.maxTokens);
    setTopK(settings.topK);
    setTopP(settings.topP);
    setModel(settings.model);
    setEnableStreaming(settings.enableStreaming);
    setSafetySettings(settings.safetySettings);
  }, [settings]);

  // 更新安全设置
  const updateSafetySetting = (category: keyof typeof safetySettings, value: HarmBlockThreshold) => {
    setSafetySettings(prev => ({
      ...prev,
      [category]: value
    }));
  };

  // 保存设置
  const handleSave = () => {
    updateSettings({
      apiKey,
      temperature,
      maxTokens,
      topK,
      topP,
      model,
      enableStreaming,
      safetySettings,
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

        {/* 模型选择 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">模型选择</h2>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              选择要使用的Gemini模型
            </p>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full max-w-md p-2 border rounded-md bg-background"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
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
                max="2"
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
                max="8192"
                step="256"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                控制生成响应的最大长度。较高的值允许更长的回复，但可能增加API成本。
              </p>
            </div>

            {/* Top-K 设置 */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="topK" className="text-sm font-medium">
                  Top-K: {topK}
                </label>
              </div>
              <input
                id="topK"
                type="range"
                min="1"
                max="100"
                step="1"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                每个步骤考虑的最高概率词汇数量。较低的值使输出更加聚焦，较高的值使输出更加多样化。
              </p>
            </div>

            {/* Top-P 设置 */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="topP" className="text-sm font-medium">
                  Top-P: {topP}
                </label>
              </div>
              <input
                id="topP"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                累积概率阈值。模型将考虑累积概率达到此阈值的词汇。较低的值使输出更加确定，较高的值使输出更加多样化。
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

        {/* 安全设置 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">安全设置</h2>
          <p className="text-sm text-muted-foreground mb-4">
            控制模型对不同类型内容的过滤程度。选择"不阻止"将允许所有内容。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 仇恨言论 */}
            <div className="space-y-2">
              <label htmlFor="hateSpeech" className="text-sm font-medium">
                仇恨言论
              </label>
              <select
                id="hateSpeech"
                value={safetySettings.hateSpeech}
                onChange={(e) => updateSafetySetting('hateSpeech', e.target.value as HarmBlockThreshold)}
                className="w-full p-2 border rounded-md bg-background"
              >
                {SAFETY_THRESHOLD_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 骚扰内容 */}
            <div className="space-y-2">
              <label htmlFor="harassment" className="text-sm font-medium">
                骚扰内容
              </label>
              <select
                id="harassment"
                value={safetySettings.harassment}
                onChange={(e) => updateSafetySetting('harassment', e.target.value as HarmBlockThreshold)}
                className="w-full p-2 border rounded-md bg-background"
              >
                {SAFETY_THRESHOLD_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 色情内容 */}
            <div className="space-y-2">
              <label htmlFor="sexuallyExplicit" className="text-sm font-medium">
                色情内容
              </label>
              <select
                id="sexuallyExplicit"
                value={safetySettings.sexuallyExplicit}
                onChange={(e) => updateSafetySetting('sexuallyExplicit', e.target.value as HarmBlockThreshold)}
                className="w-full p-2 border rounded-md bg-background"
              >
                {SAFETY_THRESHOLD_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 危险内容 */}
            <div className="space-y-2">
              <label htmlFor="dangerousContent" className="text-sm font-medium">
                危险内容
              </label>
              <select
                id="dangerousContent"
                value={safetySettings.dangerousContent}
                onChange={(e) => updateSafetySetting('dangerousContent', e.target.value as HarmBlockThreshold)}
                className="w-full p-2 border rounded-md bg-background"
              >
                {SAFETY_THRESHOLD_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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