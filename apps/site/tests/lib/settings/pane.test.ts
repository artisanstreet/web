import { Option } from "effect";
import { describe, expect, it } from "vitest";
import { Pane, pane_of, url_with } from "../../../src/lib/settings/pane.ts";

const at = (path: string) => new URL(path, "https://artisan.st");

describe("pane_of", () => {
  it("opens the pane named in the URL and nothing for unknown names", () => {
    expect(pane_of(at("/?settings=sign-in"))).toEqual(Option.some(Pane.SignIn()));
    expect(pane_of(at("/?settings=delete"))).toEqual(Option.some(Pane.Delete()));
    expect(pane_of(at("/?settings=billing"))).toEqual(Option.none());
    expect(pane_of(at("/"))).toEqual(Option.none());
  });
});

describe("url_with", () => {
  it("switches panes without touching the rest of the URL", () => {
    expect(url_with(at("/machines?tab=all&settings=profile"), Option.some(Pane.Sessions()))).toBe(
      "/machines?tab=all&settings=sessions",
    );
  });

  it("closes settings and drops a finished link's outcome", () => {
    expect(url_with(at("/machines?tab=all&settings=sign-in&linked=github"), Option.none())).toBe("/machines?tab=all");
    expect(url_with(at("/?settings=sign-in&link_problem=elsewhere&provider=google"), Option.none())).toBe("/");
  });
});
