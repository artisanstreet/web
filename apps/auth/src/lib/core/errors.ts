import { Data } from "effect";

export class ApiFailure extends Data.TaggedError("ApiFailure")<{
  readonly status: number;
  readonly code: string;
  readonly message: string;
  readonly request_id: string;
}> {}

export class TransportFailure extends Data.TaggedError("TransportFailure") {}

export class DecodeFailure extends Data.TaggedError("DecodeFailure")<{
  readonly reason: string;
}> {}

export class InvalidEmail extends Data.TaggedError("InvalidEmail") {}

export type CoreFailure = ApiFailure | TransportFailure | DecodeFailure;

export const is_transient = (failure: unknown): boolean =>
  failure instanceof TransportFailure || (failure instanceof ApiFailure && failure.status >= 500);
