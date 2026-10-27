import * as React from "react";
import { Field as BaseField } from "@base-ui/react/field";

export interface TextFieldProps {
  readonly label: string;
  readonly variant?: "default" | "card";
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (next: string) => void;
  readonly type?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly error?: string;
  readonly description?: string;
  readonly id?: string;
  readonly name?: string;
  readonly autoComplete?: string;
  readonly inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
  readonly placeholder?: string;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  variant = "default",
  value,
  defaultValue,
  onValueChange,
  type = "text",
  required = false,
  disabled = false,
  error,
  description,
  id,
  name,
  autoComplete,
  inputMode,
  placeholder,
}: TextFieldProps) => {
  const field_id = React.useId();
  const control_id = id ?? field_id;
  const handle_change = (event: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange?.(event.target.value);
  };
  return (
    <BaseField.Root className="art-field" invalid={Boolean(error)}>
      <BaseField.Label htmlFor={control_id} className="art-field-label">
        {label}
        {required ? " *" : ""}
      </BaseField.Label>
      <BaseField.Control
        id={control_id}
        name={name}
        type={type}
        required={required}
        disabled={disabled}
        value={value}
        defaultValue={defaultValue}
        onChange={handle_change}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        className={variant === "card" ? "art-input art-input--card card" : "art-input"}
      />
      {description ? <BaseField.Description className="art-field-hint">{description}</BaseField.Description> : null}
      {error ? <p className="art-field-error">{error}</p> : null}
    </BaseField.Root>
  );
};
