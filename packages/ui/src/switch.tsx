import * as React from "react";
import { Switch as BaseSwitch } from "@base-ui/react/switch";

export interface SwitchProps {
  readonly label: string;
  readonly checked?: boolean;
  readonly defaultChecked?: boolean;
  readonly onCheckedChange?: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly id?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  label,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled = false,
  id,
}: SwitchProps) => {
  const fallback_id = React.useId();
  const control_id = id ?? fallback_id;
  return (
    <label htmlFor={control_id} className="art-switch">
      <BaseSwitch.Root
        id={control_id}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="art-switch-track"
      >
        <BaseSwitch.Thumb className="art-switch-thumb" />
      </BaseSwitch.Root>
      <span className="art-switch-label">{label}</span>
    </label>
  );
};
