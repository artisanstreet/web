import * as stylex from "@stylexjs/stylex";
import { field_styles } from "./styles/controls.ts";
import * as React from "react";
import { Field as BaseField } from "@base-ui/react/field";

export interface TextFieldProps {
  readonly label: string;
  readonly hide_label?: boolean;
  readonly xstyle?: stylex.StyleXStyles;
  readonly input_style?: stylex.StyleXStyles;
  readonly leading_icon?: React.ReactNode;
  readonly variant?: "default" | "card";
  readonly size?: "md" | "lg";
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
  hide_label = false,
  xstyle,
  input_style,
  leading_icon,
  variant = "default",
  size = "md",
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
    <BaseField.Root
      {...stylex.props(field_styles.root, size === "lg" && field_styles.root_lg, xstyle)}
      invalid={Boolean(error)}
    >
      <BaseField.Label
        htmlFor={control_id}
        {...stylex.props(
          field_styles.label,
          size === "lg" && field_styles.label_lg,
          hide_label && field_styles.hidden_label,
        )}
      >
        {label}
        {required ? " *" : ""}
      </BaseField.Label>
      <div {...stylex.props(field_styles.control)}>
        {leading_icon ? (
          <span
            {...stylex.props(
              field_styles.leading_icon,
              size === "lg" && field_styles.leading_icon_lg,
            )}
            aria-hidden="true"
          >
            {leading_icon}
          </span>
        ) : null}
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
          {...stylex.props(
            field_styles.input,
            size === "lg" && field_styles.input_lg,
            variant === "card" && field_styles.card,
            variant === "card" && size === "lg" && field_styles.card_lg,
            Boolean(leading_icon) && field_styles.with_icon,
            Boolean(leading_icon) && size === "lg" && field_styles.with_icon_lg,
            input_style,
          )}
        />
      </div>
      {description ? (
        <BaseField.Description {...stylex.props(field_styles.hint)}>
          {description}
        </BaseField.Description>
      ) : null}
      {error ? <p {...stylex.props(field_styles.error)}>{error}</p> : null}
    </BaseField.Root>
  );
};
