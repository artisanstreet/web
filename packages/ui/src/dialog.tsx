import * as React from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";

export interface DialogProps {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly title: string;
  readonly description?: string;
  readonly children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
}: DialogProps) => {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="art-dialog-backdrop" />
        <BaseDialog.Viewport className="art-dialog-viewport">
          <BaseDialog.Popup className="art-dialog">
            <BaseDialog.Title className="art-dialog-title">{title}</BaseDialog.Title>
            {description ? (
              <BaseDialog.Description className="art-dialog-desc">{description}</BaseDialog.Description>
            ) : null}
            <div className="art-dialog-body">{children}</div>
            <BaseDialog.Close
              className="art-button art-button--ghost art-button--sm art-dialog-close"
              aria-label="Close dialog"
            >
              ×
            </BaseDialog.Close>
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
};
