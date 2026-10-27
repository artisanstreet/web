import * as React from "react";
import { Toast as BaseToast } from "@base-ui/react/toast";

export type ToastTone = "neutral" | "ok" | "warn" | "err";

export interface PushToastInput {
  readonly title: string;
  readonly description?: string;
  readonly tone?: ToastTone;
}

export interface ToastApi {
  readonly pushToast: (input: PushToastInput) => void;
}

const ToastContext = React.createContext<ToastApi | null>(null);

export const use_toast = (): ToastApi => {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("use_toast must be used inside <ToastProvider>");
  return ctx;
};

export interface ToastProviderProps {
  readonly children: React.ReactNode;
  readonly timeout?: number;
  readonly limit?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  timeout = 5000,
  limit = 3,
}: ToastProviderProps) => {
  const manager = BaseToast.useToastManager();
  const api = React.useMemo<ToastApi>(
    () => ({
      pushToast: (input: PushToastInput) => {
        manager.add({
          title: input.title,
          description: input.description,
          type: input.tone ?? "neutral",
          timeout,
        });
      },
    }),
    [manager, timeout],
  );
  return (
    <BaseToast.Provider timeout={timeout} limit={limit}>
      <ToastContext.Provider value={api}>{children}</ToastContext.Provider>
      <BaseToast.Portal>
        <BaseToast.Viewport className="art-toast-viewport">
          {manager.toasts.map((toast) => (
            <BaseToast.Root key={toast.id} toast={toast} className={`art-toast art-toast--${toast.type ?? "neutral"}`}>
              <BaseToast.Title className="art-toast-title" />
              {toast.description ? (
                <BaseToast.Description className="art-toast-desc" />
              ) : null}
              <BaseToast.Close className="art-toast-close" aria-label="Dismiss">
                ×
              </BaseToast.Close>
            </BaseToast.Root>
          ))}
        </BaseToast.Viewport>
      </BaseToast.Portal>
    </BaseToast.Provider>
  );
};
