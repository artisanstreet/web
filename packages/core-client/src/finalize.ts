import { Data } from "effect";

export type SecondFactor = Data.TaggedEnum<{
  None: {};
  Totp: { readonly code: string };
  Recovery: { readonly code: string };
}>;

export const SecondFactor = Data.taggedEnum<SecondFactor>();

export interface FinalizePayload {
  readonly request_id: string;
  readonly request_secret: string;
  readonly factor: SecondFactor;
}

export const factor_fields = SecondFactor.$match({
  None: () => ({}),
  Totp: ({ code }) => ({ totpCode: code }),
  Recovery: ({ code }) => ({ recoveryCode: code }),
});
