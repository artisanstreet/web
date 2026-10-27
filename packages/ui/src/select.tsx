import * as React from "react";
import { Select as BaseSelect } from "@base-ui/react/select";

export interface SelectItem {
  readonly value: string;
  readonly label: string;
}

export interface SelectProps {
  readonly label: string;
  readonly items: ReadonlyArray<SelectItem>;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (next: string) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly id?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  items,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  placeholder = "Select…",
  id,
}: SelectProps) => {
  const fallback_id = React.useId();
  const control_id = id ?? fallback_id;
  const handle_value = (next: string | null): void => {
    if (typeof next === "string") onValueChange?.(next);
  };
  return (
    <div className="art-select-wrap">
      <span id={`${control_id}-label`} className="art-field-label">
        {label}
      </span>
      <BaseSelect.Root value={value} defaultValue={defaultValue} onValueChange={handle_value} disabled={disabled}>
        <BaseSelect.Trigger id={control_id} aria-labelledby={`${control_id}-label`} className="art-select-trigger">
          <BaseSelect.Value placeholder={placeholder} />
          <BaseSelect.Icon className="art-select-icon">▾</BaseSelect.Icon>
        </BaseSelect.Trigger>
        <BaseSelect.Portal>
          <BaseSelect.Positioner className="art-select-positioner">
            <BaseSelect.Popup className="art-select-popup">
              <BaseSelect.List className="art-select-list">
                {items.map((item) => (
                  <BaseSelect.Item key={item.value} value={item.value} className="art-select-item">
                    <BaseSelect.ItemIndicator className="art-select-check">✓</BaseSelect.ItemIndicator>
                    <BaseSelect.ItemText>{item.label}</BaseSelect.ItemText>
                  </BaseSelect.Item>
                ))}
              </BaseSelect.List>
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
    </div>
  );
};
