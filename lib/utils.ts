import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(input: string | number | Date): string {
  const date = new Date(input);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

// 从URL/DataURL中提取图像内容
export async function extractImageContent(url: string): Promise<string | null> {
  try {
    if (url.startsWith('data:')) {
      return url;
    }
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('提取图像内容时出错:', error);
    return null;
  }
}

// 用于生成唯一ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
} 