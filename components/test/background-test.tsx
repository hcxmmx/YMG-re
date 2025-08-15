"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChatBackgroundSettings } from '@/lib/types';
import { applyChatBackground } from '@/lib/background-utils';

export function BackgroundTest() {
  const [currentBackground, setCurrentBackground] = useState<ChatBackgroundSettings>({
    type: 'none',
    imageTransform: {
      translateX: 0,
      translateY: 0,
      scale: 1,
      rotate: 0,
      sizeMode: 'cover',
    },
    opacity: 100,
    blur: 0,
    overlay: false,
    overlayOpacity: 50,
  });

  const testGradient = () => {
    const gradientSettings: ChatBackgroundSettings = {
      ...currentBackground,
      type: 'gradient',
      gradientType: 'linear',
      gradientDirection: 'to bottom right',
      gradientColors: ['#667eea', '#764ba2'],
    };
    setCurrentBackground(gradientSettings);
    applyChatBackground(gradientSettings);
  };

  const testColor = () => {
    const colorSettings: ChatBackgroundSettings = {
      ...currentBackground,
      type: 'color',
      backgroundColor: '#1f2937',
    };
    setCurrentBackground(colorSettings);
    applyChatBackground(colorSettings);
  };

  const testReset = () => {
    const resetSettings: ChatBackgroundSettings = {
      ...currentBackground,
      type: 'none',
    };
    setCurrentBackground(resetSettings);
    applyChatBackground(resetSettings);
  };

  return (
    <div className="p-4 space-y-4 border rounded-lg">
      <h3 className="text-lg font-semibold">背景功能测试</h3>
      <div className="flex gap-2">
        <Button onClick={testGradient} size="sm">
          测试渐变
        </Button>
        <Button onClick={testColor} size="sm">
          测试纯色
        </Button>
        <Button onClick={testReset} size="sm" variant="outline">
          重置
        </Button>
      </div>
      <div className="text-sm text-muted-foreground">
        当前背景类型: {currentBackground.type}
      </div>
    </div>
  );
}
