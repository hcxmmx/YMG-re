// 这个文件是从 shadcn/ui 的 toast 组件中提取的
// https://ui.shadcn.com/docs/components/toast

import { useEffect, useState } from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
}

interface ToastState {
  toasts: Toast[];
}

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 3000;

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function generateId() {
  return `${count++}`;
}

// 简化版的toast状态管理，使用全局事件与Toaster组件通信
export function useToast() {
  const toast = (props: Omit<Toast, "id">) => {
    const id = generateId();
    const newToast = { id, ...props };
    
    // 发送全局事件给Toaster组件
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('toast', { detail: newToast });
      window.dispatchEvent(event);
    }
    
    return id;
  };

  const dismiss = (toastId: string) => {
    // 发送dismiss事件
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('toast-dismiss', { detail: { id: toastId } });
      window.dispatchEvent(event);
    }
  };

  return {
    toast,
    dismiss,
    toasts: [], // 这个不再使用，状态由Toaster组件管理
  };
} 