import * as React from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";

export interface CheckboxProps {
  readonly label: string;
  readonly checked?: boolean;
  readonly defaultChecked?: boolean;
  readonly onCheckedChange?: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly id?: string;
  readonly name?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled = false,
  required = false,
  id,
  name,
}: CheckboxProps) => {
  const fallback_id = React.useId();
  const control_id = id ?? fallback_id;
  return (
    <label htmlFor={control_id} className="art-check">
      <BaseCheckbox.Root
        id={control_id}
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        required={required}
        className="art-check-box"
      >
        <BaseCheckbox.Indicator className="art-check-mark" />
      </BaseCheckbox.Root>
      <span className="art-check-label">{label}</span>
    </label>
  );
};
