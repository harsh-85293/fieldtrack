import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'border-l-emerald-500 bg-white',
  error: 'border-l-red-500 bg-white',
  warning: 'border-l-amber-500 bg-white',
  info: 'border-l-primary-500 bg-white',
};

const iconColors = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-primary-500',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
    return id;
  }, [removeToast]);

  const toastSuccess = useCallback((msg, duration) => toast(msg, 'success', duration), [toast]);
  const toastError = useCallback((msg, duration) => toast(msg, 'error', duration), [toast]);
  const toastWarning = useCallback((msg, duration) => toast(msg, 'warning', duration), [toast]);
  const toastInfo = useCallback((msg, duration) => toast(msg, 'info', duration), [toast]);

  const value = {
    toast,
    toastSuccess,
    toastError,
    toastWarning,
    toastInfo,
    removeToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const Icon = icons[t.type] || Info;
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border-l-4 ${styles[t.type] || styles.info} pointer-events-auto animate-in slide-in-from-right`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColors[t.type] || iconColors.info}`} />
              <p className="flex-1 text-sm text-gray-700">{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="w-4 h-4" />
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
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
