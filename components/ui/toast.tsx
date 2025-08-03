"use client";

import { useEffect, useState } from "react";
import { Toast } from "./use-toast";

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

export function ToastComponent({ toast, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, []);

  return (
    <div
      className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      } ${
        toast.variant === "destructive"
          ? "bg-destructive text-destructive-foreground"
          : "bg-background border"
      }`}
    >
      <div className="flex flex-col gap-1">
        {toast.title && <h3 className="font-semibold">{toast.title}</h3>}
        {toast.description && <p className="text-sm">{toast.description}</p>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="absolute top-2 right-2 text-sm opacity-70 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 监听全局toast事件
  useEffect(() => {
    const handleToast = (event: CustomEvent<Toast>) => {
      setToasts((prev) => [...prev, event.detail]);
      
      // 3秒后自动移除
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== event.detail.id));
      }, 3000);
    };

    const handleDismiss = (event: CustomEvent<{ id: string }>) => {
      setToasts((prev) => prev.filter((t) => t.id !== event.detail.id));
    };

    window.addEventListener("toast" as any, handleToast as any);
    window.addEventListener("toast-dismiss" as any, handleDismiss as any);
    
    return () => {
      window.removeEventListener("toast" as any, handleToast as any);
      window.removeEventListener("toast-dismiss" as any, handleDismiss as any);
    };
  }, []);

  return (
    <>
      {toasts.map((toast) => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        />
      ))}
    </>
  );
} 