import * as React from "react";
import { Button as BaseButton } from "@base-ui/react/button";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
}

const class_for = (variant: ButtonVariant, size: ButtonSize): string =>
  `art-button art-button--${variant} art-button--${size}`;

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  className,
  type,
  ...rest
}: ButtonProps) => {
  const merged = [class_for(variant, size), className].filter(Boolean).join(" ");
  return <BaseButton className={merged} type={type ?? "button"} {...rest} />;
};
