import * as stylex from "@stylexjs/stylex";
import { field_styles } from "./styles/controls.ts";
import * as React from "react";
import { Field as BaseField } from "@base-ui/react/field";

export interface TextFieldProps {
  readonly label: string;
  readonly xstyle?: stylex.StyleXStyles;
  readonly input_style?: stylex.StyleXStyles;
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
  xstyle,
  input_style,
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
    <BaseField.Root {...stylex.props(field_styles.root, xstyle)} invalid={Boolean(error)}>
      <BaseField.Label htmlFor={control_id} {...stylex.props(field_styles.label)}>
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
        {...stylex.props(field_styles.input, variant === "card" && field_styles.card, input_style)}
      />
      {description ? (
        <BaseField.Description {...stylex.props(field_styles.hint)}>
          {description}
        </BaseField.Description>
      ) : null}
      {error ? <p {...stylex.props(field_styles.error)}>{error}</p> : null}
    </BaseField.Root>
  );
};
