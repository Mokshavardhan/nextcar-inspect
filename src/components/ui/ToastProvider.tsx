"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (item: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [...prev, { ...item, id }]);
      setTimeout(() => remove(id), 4500);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2.5 sm:bottom-6 sm:right-6"
      >
        {items.map((item) => {
          const icon =
            item.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#16A34A]" />
            ) : item.type === "error" ? (
              <AlertCircle className="h-5 w-5 shrink-0 text-[#DC2626]" />
            ) : item.type === "warning" ? (
              <AlertTriangle className="h-5 w-5 shrink-0 text-[#F59E0B]" />
            ) : (
              <Info className="h-5 w-5 shrink-0 text-[#2563EB]" />
            );

          const borderColor =
            item.type === "success"
              ? "border-l-4 border-l-[#16A34A]"
              : item.type === "error"
              ? "border-l-4 border-l-[#DC2626]"
              : item.type === "warning"
              ? "border-l-4 border-l-[#F59E0B]"
              : "border-l-4 border-l-[#2563EB]";

          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg transition-all ${borderColor}`}
            >
              {icon}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#172033]">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 text-xs text-slate-600">{item.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

