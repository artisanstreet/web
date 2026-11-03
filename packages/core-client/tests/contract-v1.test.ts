import { Exit, Schema } from "effect";
import { describe, expect, it } from "vitest";
import * as C from "../src/contract-v1.ts";

const ulid = "01HZY3K8M9N0PQRSTVWXYZ0123";

const decodes = <A>(schema: Schema.Codec<A, unknown>, input: unknown) =>
  Exit.isSuccess(Schema.decodeUnknownExit(schema)(input));

const bundle = (files: ReadonlyArray<unknown>) => ({
  bundle: null,
  manifest: {
    format: "ast-editor-config/1",
    mcp_servers: [],
    skills: [{ name: "review", source: "local", bundle: { files } }],
  },
});

const skill_file = { path: "SKILL.md", content_base64: "aGk", sha256: "a".repeat(64) };

describe("contract v1", () => {
  it("accepts ids only with their own prefix and a Crockford ULID", () => {
    expect(decodes(C.MachineId, `mch_${ulid}`)).toBe(true);
    expect(decodes(C.MachineId, `acct_${ulid}`)).toBe(false);
    expect(decodes(C.MachineId, `mch_${ulid.toLowerCase()}`)).toBe(false);
    expect(decodes(C.MachineId, "mch_01HZY3K8M9N0PQRSTVWXYZ012I")).toBe(false);
  });

  it("accepts parseable timestamps only", () => {
    expect(decodes(C.Rfc3339, "2026-10-29T12:00:00Z")).toBe(true);
    expect(decodes(C.Rfc3339, "tomorrow")).toBe(false);
  });

  it("reads login status responses with known statuses only", () => {
    const status = (value: string) => ({
      request_id: `logreq_${ulid}`,
      status: value,
      totp_required: false,
      email: "ada@artisan.email",
      expires_at: "2026-10-29T12:00:00Z",
    });
    expect(decodes(C.MagicStatusResp, status("email_approved"))).toBe(true);
    expect(decodes(C.MagicStatusResp, status("approved"))).toBe(false);
  });

  it("bounds embedded skill bundles to between 1 and 64 files", () => {
    expect(decodes(C.BundleLatestResp, bundle([skill_file]))).toBe(true);
    expect(decodes(C.BundleLatestResp, bundle([]))).toBe(false);
    expect(decodes(C.BundleLatestResp, bundle(Array.from({ length: 65 }, () => skill_file)))).toBe(false);
  });
});
