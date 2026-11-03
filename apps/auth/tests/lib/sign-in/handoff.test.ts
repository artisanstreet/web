import { Option } from "effect";
import { describe, expect, it } from "vitest";
import { approved_for, decode_handoff, Handoff, present_for } from "../../../src/lib/sign-in/handoff.ts";

describe("decode_handoff", () => {
  it("reads both signals", () => {
    expect(decode_handoff({ _tag: "Approved", request_id: "logreq_1" })).toEqual(
      Option.some(Handoff.cases.Approved.make({ request_id: "logreq_1" })),
    );
    expect(decode_handoff({ _tag: "Present", request_id: "logreq_1" })).toEqual(
      Option.some(Handoff.cases.Present.make({ request_id: "logreq_1" })),
    );
  });

  it("drops anything else on the channel", () => {
    expect(decode_handoff({ _tag: "Approved" })).toEqual(Option.none());
    expect(decode_handoff({ _tag: "Rejected", request_id: "logreq_1" })).toEqual(Option.none());
    expect(decode_handoff("Approved")).toEqual(Option.none());
    expect(decode_handoff(null)).toEqual(Option.none());
  });
});

describe("signal matching", () => {
  const approved = Handoff.cases.Approved.make({ request_id: "logreq_1" });
  const present = Handoff.cases.Present.make({ request_id: "logreq_1" });

  it("only answers its own request", () => {
    expect(approved_for("logreq_1")(approved)).toBe(true);
    expect(approved_for("logreq_2")(approved)).toBe(false);
    expect(approved_for("logreq_1")(present)).toBe(false);
  });

  it("only counts a reply for the announced request", () => {
    expect(present_for("logreq_1")(present)).toBe(true);
    expect(present_for("logreq_2")(present)).toBe(false);
    expect(present_for("logreq_1")(approved)).toBe(false);
  });
});
