"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, RotateCw, Move, ZoomIn, Crop, Palette, Trash2, Eye } from 'lucide-react';
import type { ChatBackgroundSettings, ImageTransform, PresetBackground, BackgroundSizeMode } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ChatBackgroundSettingsProps {
  settings: ChatBackgroundSettings;
  onChange: (settings: ChatBackgroundSettings) => void;
}

// 背景尺寸模式选项
const SIZE_MODE_OPTIONS = [
  { value: 'cover', label: '覆盖 (Cover)', description: '保持比例，填满容器，可能裁剪' },
  { value: 'contain', label: '包含 (Contain)', description: '保持比例，完整显示，可能有空白' },
  { value: 'auto', label: '自动 (Auto)', description: '原始尺寸显示' },
  { value: 'stretch', label: '拉伸 (Stretch)', description: '拉伸填满，可能变形' },
  { value: 'custom', label: '自定义 (Custom)', description: '手动调整缩放和位置' },
] as const;

// 预设背景选项
const PRESET_BACKGROUNDS: PresetBackground[] = [
  // 渐变背景
  {
    id: 'gradient-1',
    name: '蓝色渐变',
    type: 'gradient',
    gradientType: 'linear',
    gradientDirection: 'to bottom right',
    gradientColors: ['#667eea', '#764ba2'],
  },
  {
    id: 'gradient-2',
    name: '紫色渐变',
    type: 'gradient',
    gradientType: 'linear',
    gradientDirection: 'to right',
    gradientColors: ['#8b5cf6', '#ec4899'],
  },
  {
    id: 'gradient-3',
    name: '橙色渐变',
    type: 'gradient',
    gradientType: 'radial',
    gradientDirection: 'circle',
    gradientColors: ['#f59e0b', '#ef4444'],
  },
  {
    id: 'gradient-4',
    name: '绿色渐变',
    type: 'gradient',
    gradientType: 'linear',
    gradientDirection: 'to bottom',
    gradientColors: ['#10b981', '#059669'],
  },
  {
    id: 'gradient-5',
    name: '夜空渐变',
    type: 'gradient',
    gradientType: 'linear',
    gradientDirection: 'to bottom',
    gradientColors: ['#1e3a8a', '#312e81', '#1f2937'],
  },
  {
    id: 'gradient-6',
    name: '日落渐变',
    type: 'gradient',
    gradientType: 'linear',
    gradientDirection: 'to top',
    gradientColors: ['#fbbf24', '#f59e0b', '#dc2626'],
  },
  // 纯色背景
  {
    id: 'color-1',
    name: '深色',
    type: 'color',
    backgroundColor: '#1f2937',
  },
  {
    id: 'color-2',
    name: '浅灰',
    type: 'color',
    backgroundColor: '#f3f4f6',
  },
  {
    id: 'color-3',
    name: '深蓝',
    type: 'color',
    backgroundColor: '#1e40af',
  },
  {
    id: 'color-4',
    name: '深绿',
    type: 'color',
    backgroundColor: '#059669',
  },
  {
    id: 'color-5',
    name: '深紫',
    type: 'color',
    backgroundColor: '#7c3aed',
  },
  {
    id: 'color-6',
    name: '暖白',
    type: 'color',
    backgroundColor: '#fef7ed',
  },
];

export function ChatBackgroundSettings({ settings, onChange }: ChatBackgroundSettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);

  // 处理文件上传
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    try {
      // 直接处理图片，不使用IndexedDB
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // 计算压缩后的尺寸（最大1920x1080）
          const maxWidth = 1920;
          const maxHeight = 1080;
          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);

          // 转换为base64
          const imageUrl = canvas.toDataURL('image/jpeg', 0.8);

          setOriginalImage(img);
          setImageLoaded(true);

          onChange({
            ...settings,
            type: 'image',
            imageUrl,
            imageTransform: {
              translateX: 0,
              translateY: 0,
              scale: 1,
              rotate: 0,
              sizeMode: 'cover',
            },
          });
        } catch (error) {
          console.error('处理图片失败:', error);
          alert('处理图片失败，请重试');
        }
      };

      img.onerror = () => {
        console.error('图片加载失败');
        alert('图片加载失败，请选择其他图片');
      };

      img.src = URL.createObjectURL(file);
    } catch (error) {
      console.error('上传图片失败:', error);
      alert('上传图片失败，请重试');
    }
  }, [settings, onChange]);

  // 处理拖拽开始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (settings.type !== 'image' || !settings.imageUrl) return;

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  }, [settings]);

  // 处理拖拽移动
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || settings.type !== 'image') return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    // 转换为百分比，调整灵敏度
    const container = previewRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      // 降低灵敏度，使拖拽更精确
      const percentX = (deltaX / rect.width) * 50;
      const percentY = (deltaY / rect.height) * 50;

      const newTranslateX = Math.max(-200, Math.min(200, settings.imageTransform.translateX + percentX));
      const newTranslateY = Math.max(-200, Math.min(200, settings.imageTransform.translateY + percentY));

      // 如果位置发生变化且不是自定义模式，自动切换到自定义模式
      const shouldSwitchToCustom = settings.imageTransform.sizeMode !== 'custom' &&
        (newTranslateX !== settings.imageTransform.translateX || newTranslateY !== settings.imageTransform.translateY);

      onChange({
        ...settings,
        imageTransform: {
          ...settings.imageTransform,
          translateX: newTranslateX,
          translateY: newTranslateY,
          sizeMode: shouldSwitchToCustom ? 'custom' : settings.imageTransform.sizeMode,
        },
      });
    }

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, settings, onChange]);

  // 处理拖拽结束
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 添加全局事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 生成背景样式
  const getBackgroundStyle = useCallback(() => {
    const { type, imageUrl, imageTransform, gradientType, gradientDirection, gradientColors, backgroundColor, opacity, blur } = settings;

    switch (type) {
      case 'image':
        if (imageUrl) {
          const { translateX, translateY, scale, rotate, sizeMode } = imageTransform;

          let backgroundSize = '';
          let backgroundPosition = 'center';

          switch (sizeMode) {
            case 'cover':
              backgroundSize = 'cover';
              if (translateX !== 0 || translateY !== 0) {
                backgroundPosition = `${50 + translateX}% ${50 + translateY}%`;
              }
              break;
            case 'contain':
              backgroundSize = 'contain';
              if (translateX !== 0 || translateY !== 0) {
                backgroundPosition = `${50 + translateX}% ${50 + translateY}%`;
              }
              break;
            case 'auto':
              backgroundSize = 'auto';
              if (translateX !== 0 || translateY !== 0) {
                backgroundPosition = `${50 + translateX}% ${50 + translateY}%`;
              }
              break;
            case 'stretch':
              backgroundSize = '100% 100%';
              if (translateX !== 0 || translateY !== 0) {
                backgroundPosition = `${50 + translateX}% ${50 + translateY}%`;
              }
              break;
            case 'custom':
              backgroundSize = `${scale * 100}%`;
              backgroundPosition = `${50 + translateX}% ${50 + translateY}%`;
              break;
          }

          return {
            backgroundImage: `url(${imageUrl})`,
            backgroundSize,
            backgroundPosition,
            backgroundRepeat: 'no-repeat',
            transform: `rotate(${rotate}deg)`,
            opacity: opacity / 100,
            filter: blur > 0 ? `blur(${blur}px)` : 'none',
          };
        }
        break;
      case 'gradient':
        if (gradientColors && gradientColors.length >= 2) {
          const colors = gradientColors.join(', ');
          return {
            backgroundImage: `${gradientType}-gradient(${gradientDirection}, ${colors})`,
            opacity: opacity / 100,
            filter: blur > 0 ? `blur(${blur}px)` : 'none',
          };
        }
        break;
      case 'color':
        if (backgroundColor) {
          return {
            backgroundColor,
            opacity: opacity / 100,
            filter: blur > 0 ? `blur(${blur}px)` : 'none',
          };
        }
        break;
    }

    return {
      opacity: opacity / 100,
      filter: blur > 0 ? `blur(${blur}px)` : 'none',
    };
  }, [settings]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          聊天背景设置
        </CardTitle>
        <CardDescription>
          自定义聊天界面的背景，支持图片、渐变和纯色背景
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 背景类型选择 */}
        <Tabs value={settings.type} onValueChange={(value) => onChange({ ...settings, type: value as any })}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="none">无背景</TabsTrigger>
            <TabsTrigger value="image">图片</TabsTrigger>
            <TabsTrigger value="gradient">渐变</TabsTrigger>
            <TabsTrigger value="color">纯色</TabsTrigger>
          </TabsList>

          {/* 图片背景设置 */}
          <TabsContent value="image" className="space-y-4">
            <div className="space-y-4">
              {/* 文件上传 */}
              <div>
                <Label>上传背景图片</Label>
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    选择图片
                  </Button>
                </div>
              </div>

              {/* 图片预览和调整 */}
              {settings.imageUrl && (
                <div className="space-y-4">
                  <Label>图片预览和调整</Label>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      拖拽图片调整位置，使用下方滑块调整缩放和旋转
                    </p>

                    {/* 大尺寸响应式预览框 */}
                    <div className="relative">
                      <div
                        ref={previewRef}
                        className="relative w-full h-64 md:h-80 lg:h-96 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50 cursor-move"
                        onMouseDown={handleMouseDown}
                        style={getBackgroundStyle()}
                      >
                        {/* 网格背景 */}
                        <div className="absolute inset-0 opacity-10" style={{
                          backgroundImage: `
                            linear-gradient(45deg, #000 25%, transparent 25%),
                            linear-gradient(-45deg, #000 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #000 75%),
                            linear-gradient(-45deg, transparent 75%, #000 75%)
                          `,
                          backgroundSize: '20px 20px',
                          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                        }} />

                        {/* 预览区域指示器 */}
                        <div className="absolute inset-8 border-2 border-blue-500 border-dashed rounded bg-blue-500/10 pointer-events-none">
                          <div className="absolute -top-8 left-0 text-blue-600 text-sm font-medium bg-white px-2 py-1 rounded shadow-sm">
                            聊天背景预览区域
                          </div>
                        </div>

                        {/* 操作提示 */}
                        <div className="absolute bottom-4 left-4 right-4 text-center">
                          <div className="inline-block bg-black/80 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
                            <div className="flex items-center justify-center gap-2">
                              <Move className="w-4 h-4" />
                              <span>
                                {settings.imageTransform.sizeMode === 'custom'
                                  ? '拖拽调整位置'
                                  : '拖拽微调位置（将切换到自定义模式）'
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 重置按钮 */}
                      <div className="absolute top-2 right-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onChange({
                            ...settings,
                            imageTransform: {
                              ...settings.imageTransform,
                              translateX: 0,
                              translateY: 0,
                              scale: 1,
                              rotate: 0,
                            }
                          })}
                          className="h-8 w-8 p-0"
                          title="重置位置和缩放"
                        >
                          <RotateCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* 尺寸模式选择 */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <Label>背景尺寸模式</Label>
                        {settings.imageTransform.sizeMode === 'custom' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onChange({
                              ...settings,
                              imageTransform: {
                                ...settings.imageTransform,
                                translateX: 0,
                                translateY: 0,
                                scale: 1,
                                rotate: 0,
                                sizeMode: 'cover', // 重置到覆盖模式
                              }
                            })}
                            className="text-xs h-7"
                          >
                            重置为覆盖模式
                          </Button>
                        )}
                      </div>
                      <Select
                        value={settings.imageTransform.sizeMode}
                        onValueChange={(value: BackgroundSizeMode) => {
                          // 切换模式时重置变换参数（除了自定义模式）
                          if (value !== 'custom') {
                            onChange({
                              ...settings,
                              imageTransform: {
                                ...settings.imageTransform,
                                sizeMode: value,
                                translateX: 0,
                                translateY: 0,
                                scale: 1,
                                rotate: 0,
                              }
                            });
                          } else {
                            onChange({
                              ...settings,
                              imageTransform: { ...settings.imageTransform, sizeMode: value }
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SIZE_MODE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div>
                                <div className="font-medium">{option.label}</div>
                                <div className="text-xs text-muted-foreground">{option.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 图片调整控制 - 始终显示 */}
                    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-700">图片调整</div>
                        {settings.imageTransform.sizeMode !== 'custom' && (
                          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            调整参数将自动切换到自定义模式
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>缩放: {settings.imageTransform.scale.toFixed(1)}x</Label>
                          <div className="flex items-center gap-2 mt-2">
                            <Slider
                              value={[settings.imageTransform.scale]}
                              onValueChange={([value]) => {
                                // 如果不是自定义模式且值发生变化，自动切换到自定义模式
                                const shouldSwitchToCustom = settings.imageTransform.sizeMode !== 'custom' && value !== settings.imageTransform.scale;
                                onChange({
                                  ...settings,
                                  imageTransform: {
                                    ...settings.imageTransform,
                                    scale: value,
                                    sizeMode: shouldSwitchToCustom ? 'custom' : settings.imageTransform.sizeMode
                                  }
                                });
                              }}
                              min={0.1}
                              max={3}
                              step={0.1}
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              value={settings.imageTransform.scale.toFixed(1)}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value) && value >= 0.1 && value <= 3) {
                                  const shouldSwitchToCustom = settings.imageTransform.sizeMode !== 'custom' && value !== settings.imageTransform.scale;
                                  onChange({
                                    ...settings,
                                    imageTransform: {
                                      ...settings.imageTransform,
                                      scale: value,
                                      sizeMode: shouldSwitchToCustom ? 'custom' : settings.imageTransform.sizeMode
                                    }
                                  });
                                }
                              }}
                              min={0.1}
                              max={3}
                              step={0.1}
                              className="w-20"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>旋转: {settings.imageTransform.rotate}°</Label>
                          <div className="flex items-center gap-2 mt-2">
                            <Slider
                              value={[settings.imageTransform.rotate]}
                              onValueChange={([value]) => {
                                const shouldSwitchToCustom = settings.imageTransform.sizeMode !== 'custom' && value !== settings.imageTransform.rotate;
                                onChange({
                                  ...settings,
                                  imageTransform: {
                                    ...settings.imageTransform,
                                    rotate: value,
                                    sizeMode: shouldSwitchToCustom ? 'custom' : settings.imageTransform.sizeMode
                                  }
                                });
                              }}
                              min={0}
                              max={360}
                              step={1}
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              value={settings.imageTransform.rotate}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                if (!isNaN(value) && value >= 0 && value <= 360) {
                                  const shouldSwitchToCustom = settings.imageTransform.sizeMode !== 'custom' && value !== settings.imageTransform.rotate;
                                  onChange({
                                    ...settings,
                                    imageTransform: {
                                      ...settings.imageTransform,
                                      rotate: value,
                                      sizeMode: shouldSwitchToCustom ? 'custom' : settings.imageTransform.sizeMode
                                    }
                                  });
                                }
                              }}
                              min={0}
                              max={360}
                              step={1}
                              className="w-20"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 位置微调 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>水平位置: {settings.imageTransform.translateX.toFixed(0)}</Label>
                          <Slider
                            value={[settings.imageTransform.translateX]}
                            onValueChange={([value]) => {
                              const shouldSwitchToCustom = settings.imageTransform.sizeMode !== 'custom' && value !== settings.imageTransform.translateX;
                              onChange({
                                ...settings,
                                imageTransform: {
                                  ...settings.imageTransform,
                                  translateX: value,
                                  sizeMode: shouldSwitchToCustom ? 'custom' : settings.imageTransform.sizeMode
                                }
                              });
                            }}
                            min={-200}
                            max={200}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>垂直位置: {settings.imageTransform.translateY.toFixed(0)}</Label>
                          <Slider
                            value={[settings.imageTransform.translateY]}
                            onValueChange={([value]) => {
                              const shouldSwitchToCustom = settings.imageTransform.sizeMode !== 'custom' && value !== settings.imageTransform.translateY;
                              onChange({
                                ...settings,
                                imageTransform: {
                                  ...settings.imageTransform,
                                  translateY: value,
                                  sizeMode: shouldSwitchToCustom ? 'custom' : settings.imageTransform.sizeMode
                                }
                              });
                            }}
                            min={-200}
                            max={200}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 渐变背景设置 */}
          <TabsContent value="gradient" className="space-y-4">
            <div>
              <Label className="text-base font-medium">预设渐变背景</Label>
              <p className="text-sm text-muted-foreground mb-4">选择一个预设的渐变背景</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PRESET_BACKGROUNDS.filter(bg => bg.type === 'gradient').map((preset) => (
                  <div
                    key={preset.id}
                    className={cn(
                      "h-20 rounded-lg border-2 cursor-pointer transition-all hover:scale-105",
                      settings.presetId === preset.id ? "border-primary ring-2 ring-primary/20" : "border-gray-200 hover:border-gray-300"
                    )}
                    style={{
                      background: `${preset.gradientType}-gradient(${preset.gradientDirection}, ${preset.gradientColors?.join(', ')})`
                    }}
                    onClick={() => onChange({
                      ...settings,
                      type: 'gradient',
                      presetId: preset.id,
                      gradientType: preset.gradientType,
                      gradientDirection: preset.gradientDirection,
                      gradientColors: preset.gradientColors,
                    })}
                  >
                    <div className="h-full flex items-center justify-center text-white text-sm font-medium bg-black/30 rounded-lg">
                      {preset.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* 纯色背景设置 */}
          <TabsContent value="color" className="space-y-4">
            <div>
              <Label className="text-base font-medium">预设纯色背景</Label>
              <p className="text-sm text-muted-foreground mb-4">选择一个预设的纯色背景</p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {PRESET_BACKGROUNDS.filter(bg => bg.type === 'color').map((preset) => (
                  <div
                    key={preset.id}
                    className={cn(
                      "h-16 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 relative",
                      settings.presetId === preset.id ? "border-primary ring-2 ring-primary/20" : "border-gray-200 hover:border-gray-300"
                    )}
                    style={{ backgroundColor: preset.backgroundColor }}
                    onClick={() => onChange({
                      ...settings,
                      type: 'color',
                      presetId: preset.id,
                      backgroundColor: preset.backgroundColor,
                    })}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={cn(
                        "text-xs font-medium px-2 py-1 rounded",
                        preset.backgroundColor && (preset.backgroundColor.includes('f') || preset.backgroundColor === '#fef7ed')
                          ? "text-gray-800 bg-white/80"
                          : "text-white bg-black/30"
                      )}>
                        {preset.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>自定义颜色</Label>
              <div className="flex items-center gap-3 mt-2">
                <Input
                  type="color"
                  value={settings.backgroundColor || '#ffffff'}
                  onChange={(e) => onChange({
                    ...settings,
                    type: 'color',
                    backgroundColor: e.target.value,
                    presetId: undefined,
                  })}
                  className="h-12 w-20"
                />
                <Input
                  type="text"
                  placeholder="#ffffff"
                  value={settings.backgroundColor || '#ffffff'}
                  onChange={(e) => onChange({
                    ...settings,
                    type: 'color',
                    backgroundColor: e.target.value,
                    presetId: undefined,
                  })}
                  className="flex-1"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* 通用设置 */}
        {settings.type !== 'none' && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">通用设置</h4>
            
            <div>
              <Label>透明度: {settings.opacity}%</Label>
              <Slider
                value={[settings.opacity]}
                onValueChange={([value]) => onChange({ ...settings, opacity: value })}
                min={0}
                max={100}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>模糊程度: {settings.blur}px</Label>
              <Slider
                value={[settings.blur]}
                onValueChange={([value]) => onChange({ ...settings, blur: value })}
                min={0}
                max={20}
                step={1}
                className="mt-2"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>添加遮罩层</Label>
              <Switch
                checked={settings.overlay}
                onCheckedChange={(checked) => onChange({ ...settings, overlay: checked })}
              />
            </div>

            {settings.overlay && (
              <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                <div>
                  <Label>遮罩颜色</Label>
                  <Input
                    type="color"
                    value={settings.overlayColor || '#000000'}
                    onChange={(e) => onChange({ ...settings, overlayColor: e.target.value })}
                    className="mt-2 h-12"
                  />
                </div>
                <div>
                  <Label>遮罩透明度: {settings.overlayOpacity}%</Label>
                  <Slider
                    value={[settings.overlayOpacity]}
                    onValueChange={([value]) => onChange({ ...settings, overlayOpacity: value })}
                    min={0}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-center pt-4 border-t">
          <Button
            onClick={() => onChange({
              ...settings,
              type: 'none',
              imageUrl: undefined,
              presetId: undefined,
            })}
            variant="outline"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            清除背景
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
