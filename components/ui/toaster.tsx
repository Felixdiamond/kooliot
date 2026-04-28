"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, XCircle, X } from "lucide-react";

type ToastType = "success" | "error";

type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  toast: (type: ToastType, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => dismiss(id), TOAST_DURATION_MS);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-5 right-5 z-50 flex flex-col-reverse gap-2 pointer-events-none"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              role="alert"
              className="pointer-events-auto flex w-80 items-start gap-3 rounded-lg border bg-card px-4 py-3 shadow-soft-md"
              style={{
                borderColor:
                  t.type === "error"
                    ? "color-mix(in oklab, var(--color-status-error) 40%, var(--color-border))"
                    : "color-mix(in oklab, var(--color-status-active) 40%, var(--color-border))",
              }}
            >
              {t.type === "error" ? (
                <XCircle
                  size={17}
                  className="mt-0.5 shrink-0 text-status-error"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle
                  size={17}
                  className="mt-0.5 shrink-0 text-status-active"
                  aria-hidden="true"
                />
              )}
              <p className="flex-1 text-sm leading-snug text-foreground">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="ml-1 shrink-0 rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be called inside <ToastProvider>");
  }
  return ctx;
}
