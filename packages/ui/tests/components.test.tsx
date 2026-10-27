import { describe, expect, it } from "vitest";
import * as React from "react";
import { render, screen } from "@testing-library/react";
import { Button } from "../src/button.tsx";
import { Badge } from "../src/badge.tsx";
import { Spinner } from "../src/spinner.tsx";
import { TextField } from "../src/text-field.tsx";

describe("shared ui primitives: roles + labels", () => {
  it("renders a primary button with an accessible name", () => {
    render(<Button variant="primary">Sign in</Button>);
    const btn = screen.getByRole("button", { name: "Sign in" });
    expect(btn).toBeDefined();
    expect(btn.className).toContain("art-button--primary");
  });

  it("renders a labeled text field with hint and error slots", () => {
    render(<TextField label="Email" description="We send a one-time link." error="Enter a valid email address." />);
    expect(screen.getByText("Email")).toBeDefined();
    expect(screen.getByText("We send a one-time link.")).toBeDefined();
    expect(screen.getByText("Enter a valid email address.")).toBeDefined();
  });

  it("renders status badge tones without metric chrome", () => {
    render(<Badge tone="ok">Active</Badge>);
    expect(screen.getByText("Active")).toBeDefined();
  });

  it("exposes a polite loading status", () => {
    render(<Spinner label="Checking…" />);
    expect(screen.getByRole("status")).toBeDefined();
  });
});
