import { Data, Option } from "effect";
import type { MeResp, SignedInAccount } from "@artisanstreet/core-client";

export type Plan = Data.TaggedEnum<{
  Free: {};
  Go: {};
  Pro: {};
  Ultra: {};
}>;

export const Plan = Data.taggedEnum<Plan>();

export const upgrade_target = Plan.$match({
  Free: () => Option.some(Plan.Go()),
  Go: () => Option.some(Plan.Pro()),
  Pro: () => Option.some(Plan.Ultra()),
  Ultra: () => Option.none<Plan>(),
});

export interface Account {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly avatar: Option.Option<string>;
  readonly plan: Plan;
}

const account_from = (fields: {
  readonly account_id: string;
  readonly email: string;
  readonly display_name: string;
  readonly avatar_url: string | null;
}): Account => ({
  id: fields.account_id,
  name: fields.display_name.trim() || fields.email,
  email: fields.email,
  avatar: Option.fromNullishOr(fields.avatar_url),
  plan: Plan.Free(),
});

export const account_of = (me: MeResp): Account => account_from(me);

export const signed_in_account = (signed: SignedInAccount): Account => account_from(signed);

export type Session = Data.TaggedEnum<{
  Loading: {};
  SignedIn: { readonly account: Account; readonly accounts: ReadonlyArray<Account> };
  Unreachable: {};
}>;

export const Session = Data.taggedEnum<Session>();
