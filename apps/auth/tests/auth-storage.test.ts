// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import {
  clear_memory_secrets,
  clear_request_secret,
  load_request_secret,
  store_request_secret,
} from "../src/lib/auth-storage.ts";

const REQUEST_ID = `logreq_01K${"A".repeat(23)}`;

beforeEach(() => {
  sessionStorage.clear();
  clear_memory_secrets();
  clear_request_secret(REQUEST_ID);
});

describe("request secret custody", () => {
  it("round-trips within the tab and clears", () => {
    store_request_secret(REQUEST_ID, "shh");
    expect(load_request_secret(REQUEST_ID)).toBe("shh");
    clear_request_secret(REQUEST_ID);
    expect(load_request_secret(REQUEST_ID)).toBeNull();
  });

  it("never places the secret in the URL or history", () => {
    store_request_secret(REQUEST_ID, "super-secret-value");
    expect(window.location.href).not.toContain("super-secret-value");
    expect(document.URL).not.toContain("super-secret-value");
  });

  it("is tab-scoped: a different request id sees nothing", () => {
    store_request_secret(REQUEST_ID, "shh");
    expect(load_request_secret(`logreq_01K${"B".repeat(23)}`)).toBeNull();
  });
});
