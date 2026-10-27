import * as stylex from "@stylexjs/stylex";
import { button_styles } from "./styles/controls.ts";
import * as React from "react";
import { Button as BaseButton } from "@base-ui/react/button";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly xstyle?: stylex.StyleXStyles;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  className,
  xstyle,
  type,
  ...rest
}: ButtonProps) => {
  const compiled = stylex.props(
    button_styles.base,
    button_styles[size],
    button_styles[variant],
    xstyle,
  );
  return (
    <BaseButton
      {...compiled}
      className={[compiled.className, className].filter(Boolean).join(" ")}
      type={type ?? "button"}
      {...rest}
    />
  );
};
