import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-8 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full font-mono pointer-events-none">
      {toasts.map((toast) => {
        let borderCls = 'border-amber-500/50 bg-dark-900/95 text-amber-300';
        let icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;

        if (toast.type === 'success') {
          borderCls = 'border-emerald-500/50 bg-dark-900/95 text-emerald-300';
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
        } else if (toast.type === 'error') {
          borderCls = 'border-rose-500/50 bg-dark-900/95 text-rose-300';
          icon = <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />;
        } else if (toast.type === 'info') {
          borderCls = 'border-cyan-500/50 bg-dark-900/95 text-cyan-300';
          icon = <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start space-x-2.5 p-3 rounded-md border shadow-xl backdrop-blur-sm text-xs transition-all animate-in fade-in slide-in-from-bottom-2 ${borderCls}`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-neutral-100 text-xs mb-0.5">
                {toast.title}
              </div>
              <div className="text-2xs text-neutral-300 leading-relaxed font-sans">
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-neutral-500 hover:text-neutral-300 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
