import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, Info, X, Loader2 } from "lucide-react";

type ToastVariant = "success" | "error" | "info" | "loading";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, variant?: ToastVariant, duration?: number) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, message: string, variant: ToastVariant, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, variant: ToastVariant = "info", duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, variant, duration }]);
    return id;
  }, []);

  const updateToast = useCallback((id: string, message: string, variant: ToastVariant, duration = 4000) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, message, variant, duration } : t)));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, updateToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    if (toast.variant === "loading") return;
    const timer = setTimeout(() => onRemove(toast.id), toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.variant, toast.duration, onRemove]);

  const icons = {
    success: <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />,
    info: <Info className="h-4 w-4 text-blue-500 shrink-0" />,
    loading: <Loader2 className="h-4 w-4 text-amber-500 shrink-0 animate-spin" />,
  };

  return (
    <div
      className={cn(
        "pointer-events-auto glass-card rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 animate-slide-up",
        toast.variant === "error" && "border-red-200 dark:border-red-800/30"
      )}
    >
      {icons[toast.variant]}
      <p className="text-sm flex-1">{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
