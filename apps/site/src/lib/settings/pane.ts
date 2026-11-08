import { Data, Option } from "effect";

export type Pane = Data.TaggedEnum<{
  Profile: {};
  Plan: {};
  Appearance: {};
  SignIn: {};
  TwoStep: {};
  Sessions: {};
  Delete: {};
}>;

export const Pane = Data.taggedEnum<Pane>();

export interface PaneInfo {
  readonly pane: Pane;
  readonly slug: string;
  readonly label: string;
  readonly description: string;
}

export interface PaneGroup {
  readonly label: string;
  readonly panes: ReadonlyArray<PaneInfo>;
}

const profile: PaneInfo = {
  pane: Pane.Profile(),
  slug: "profile",
  label: "Profile",
  description: "How you appear across Artisan.",
};

const plan: PaneInfo = { pane: Pane.Plan(), slug: "plan", label: "Plan", description: "What your account includes." };

const appearance: PaneInfo = {
  pane: Pane.Appearance(),
  slug: "appearance",
  label: "Appearance",
  description: "Applies to the dashboard on this device.",
};

const sign_in: PaneInfo = {
  pane: Pane.SignIn(),
  slug: "sign-in",
  label: "Sign-in methods",
  description: "Every way into your account. You always keep at least one.",
};

const two_step: PaneInfo = {
  pane: Pane.TwoStep(),
  slug: "two-step",
  label: "Two-step sign-in",
  description: "Ask for a code from your authenticator app every time you sign in.",
};

const sessions: PaneInfo = {
  pane: Pane.Sessions(),
  slug: "sessions",
  label: "Sessions",
  description: "Browsers signed in to your account.",
};

export const danger: PaneInfo = {
  pane: Pane.Delete(),
  slug: "delete",
  label: "Delete account",
  description: "Removes your account and everything in it.",
};

export const groups: ReadonlyArray<PaneGroup> = [
  { label: "Account", panes: [profile, plan] },
  { label: "Security", panes: [sign_in, two_step, sessions] },
  { label: "Dashboard", panes: [appearance] },
];

export const info_of = Pane.$match({
  Profile: () => profile,
  Plan: () => plan,
  Appearance: () => appearance,
  SignIn: () => sign_in,
  TwoStep: () => two_step,
  Sessions: () => sessions,
  Delete: () => danger,
});

const all: ReadonlyArray<PaneInfo> = [...groups.flatMap((group) => group.panes), danger];

const pane_key = "settings";
const outcome_keys = ["linked", "link_problem", "provider"];

export const pane_of = (url: URL): Option.Option<Pane> =>
  Option.fromNullishOr(all.find((info) => info.slug === url.searchParams.get(pane_key))).pipe(
    Option.map((info) => info.pane),
  );

export const url_with = (url: URL, pane: Option.Option<Pane>): string => {
  const next = new URL(url);
  Option.match(pane, {
    onNone: () => [pane_key, ...outcome_keys].forEach((key) => next.searchParams.delete(key)),
    onSome: (open) => next.searchParams.set(pane_key, info_of(open).slug),
  });
  return `${next.pathname}${next.search}`;
};
