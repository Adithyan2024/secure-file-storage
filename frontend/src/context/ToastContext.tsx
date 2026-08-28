import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && <div className="toast">{message}</div>}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
