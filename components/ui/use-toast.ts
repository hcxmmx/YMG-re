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

// 简化版的toast状态管理
export function useToast() {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  const toast = (props: Omit<Toast, "id">) => {
    const id = generateId();
    const newToast = { id, ...props };
    
    setState((prevState) => {
      const newToasts = [...prevState.toasts, newToast].slice(-TOAST_LIMIT);
      return { toasts: newToasts };
    });
    
    // 自动移除toast
    setTimeout(() => {
      setState((prevState) => ({
        toasts: prevState.toasts.filter((t) => t.id !== id),
      }));
    }, TOAST_REMOVE_DELAY);
    
    return id;
  };

  const dismiss = (toastId: string) => {
    setState((prevState) => ({
      toasts: prevState.toasts.filter((t) => t.id !== toastId),
    }));
  };

  return {
    toast,
    dismiss,
    toasts: state.toasts,
  };
} 