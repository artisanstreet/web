import { Option } from "effect";
import { describe, expect, it } from "vitest";
import {
  Deletion,
  deletion_of,
  link_notice_of,
  live_sessions,
  last_active,
  session_title,
  method_rows,
  MethodRow,
  Notice,
} from "../../../src/lib/settings/model.ts";

const session = (id: string, created_at: string, overrides: { revoked_at?: string; expires_at?: string } = {}) => ({
  id: `sess_${id}` as never,
  device_name: "",
  totp_verified_at: null,
  created_at,
  expires_at: overrides.expires_at ?? "2026-12-01T00:00:00Z",
  revoked_at: overrides.revoked_at ?? null,
});

describe("session descriptions", () => {
  it("formats known details and falls back when metadata is missing", () => {
    const base = session("one", "2026-10-01T00:00:00Z");
    expect(session_title({ ...base, browser: "Safari", device: "iPhone", country_code: "US" })).toBe("Safari on iPhone 🇺🇸");
    expect(session_title(base)).toBe("Browser");
    expect(last_active("2026-10-31T11:29:00Z", Date.parse("2026-10-31T12:00:00Z"))).toBe("31 minutes ago");
    expect(last_active(null, 0)).toBe("Last active unavailable");
  });
});

describe("method_rows", () => {
  it("lists every method in a fixed order and only lets you remove one while another remains", () => {
    const single = method_rows({
      email: "ada@example.com",
      methods: [{ kind: "github", created_at: "2026-10-01T00:00:00Z" }],
    });
    expect(single).toEqual([
      MethodRow.Unlinked({ kind: "email" }),
      MethodRow.Unlinked({ kind: "google" }),
      MethodRow.Linked({ kind: "github", since: "2026-10-01T00:00:00Z", removable: false }),
    ]);

    const both = method_rows({
      email: "ada@example.com",
      methods: [
        { kind: "github", created_at: "2026-10-01T00:00:00Z" },
        { kind: "email", created_at: "2026-09-01T00:00:00Z" },
      ],
    });
    expect(both.filter(MethodRow.$is("Linked")).map((row) => row.removable)).toEqual([true, true]);
  });
});

describe("live_sessions", () => {
  it("drops revoked and expired sessions and puts the newest first", () => {
    const now = Date.parse("2026-10-31T12:00:00Z");
    const live = live_sessions(
      [
        session("old", "2026-10-01T00:00:00Z"),
        session("revoked", "2026-10-20T00:00:00Z", { revoked_at: "2026-10-21T00:00:00Z" }),
        session("expired", "2026-10-02T00:00:00Z", { expires_at: "2026-10-30T00:00:00Z" }),
        session("new", "2026-10-30T00:00:00Z"),
      ],
      now,
    );
    expect(live.map((found) => found.id)).toEqual(["sess_new", "sess_old"]);
  });

  it("keeps the current session first even when another is newer", () => {
    const now = Date.parse("2026-10-31T12:00:00Z");
    const current = { ...session("current", "2026-10-01T00:00:00Z"), is_current: true };
    const newer = { ...session("new", "2026-10-30T00:00:00Z"), is_current: false };
    expect(live_sessions([newer, current], now).map((found) => found.id)).toEqual(["sess_current", "sess_new"]);
  });
});

describe("deletion_of", () => {
  it("is scheduled only while a request is pending", () => {
    const base = { requested_at: null, purge_after: null, completed_at: null };
    expect(deletion_of({ ...base, status: "none" })).toEqual(Deletion.None());
    expect(deletion_of({ ...base, status: "cancelled" })).toEqual(Deletion.None());
    expect(deletion_of({ ...base, status: "pending", purge_after: "2026-11-30T00:00:00Z" })).toEqual(
      Deletion.Scheduled({ purge_after: "2026-11-30T00:00:00Z" }),
    );
  });
});

describe("link_notice_of", () => {
  const at = (query: string) => new URL(`https://dashboard.artisan.st/settings${query}`);

  it("reports how a provider link went", () => {
    expect(link_notice_of(at("?linked=github"))).toEqual(
      Option.some(Notice.Done({ section: "methods", message: "GitHub is linked. You can sign in with it now." })),
    );
    expect(link_notice_of(at("?link_problem=elsewhere&provider=google"))).toEqual(
      Option.some(
        Notice.Failed({ section: "methods", message: "That Google account already signs in to another Artisan account." }),
      ),
    );
  });

  it("ignores anything else", () => {
    expect(link_notice_of(at(""))).toEqual(Option.none());
    expect(link_notice_of(at("?linked=apple"))).toEqual(Option.none());
    expect(link_notice_of(at("?provider=github"))).toEqual(Option.none());
  });
});
