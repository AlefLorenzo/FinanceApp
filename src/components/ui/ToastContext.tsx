import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, action?: ToastMessage['action']) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', action?: ToastMessage['action']) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message, action }]);

    // Auto dismiss after 5 seconds if no action is required, or 7 seconds if action
    setTimeout(() => {
      hideToast(id);
    }, action ? 7000 : 5000);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <div 
        aria-live="polite"
        className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none w-[90%] max-w-sm"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-2xl shadow-xl animate-in slide-in-from-bottom-5 fade-in duration-300 ${
              toast.type === 'success' ? 'bg-green-900 text-green-50' :
              toast.type === 'error' ? 'bg-red-900 text-red-50' :
              'bg-gray-900 text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
            
            <div className="flex items-center gap-2 shrink-0 ml-4">
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action!.onClick();
                    hideToast(toast.id);
                  }}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl text-xs font-bold transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
              <button onClick={() => hideToast(toast.id)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-4 h-4 opacity-70" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
