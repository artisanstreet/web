import { Data, Option } from "effect";
import type {
  DeletionStatusResp,
  MeResp,
  OauthProvider,
  SessionInfo,
  SignInKind,
  SignInMethodsResp,
} from "@artisanstreet/core-client";

export type Provider = OauthProvider;
export type Kind = SignInKind;

export interface Snapshot {
  readonly me: MeResp;
  readonly methods: SignInMethodsResp;
  readonly sessions: ReadonlyArray<SessionInfo>;
  readonly deletion: DeletionStatusResp;
}

export type Settings = Data.TaggedEnum<{
  Loading: {};
  Ready: { readonly snapshot: Snapshot };
  Failed: { readonly message: string };
}>;

export const Settings = Data.taggedEnum<Settings>();

export type Section = "methods" | "security" | "sessions" | "danger";

export type Notice = Data.TaggedEnum<{
  Done: { readonly section: Section; readonly message: string };
  Failed: { readonly section: Section; readonly message: string };
}>;

export const Notice = Data.taggedEnum<Notice>();

export const notice_in = (section: Section) => (notice: Option.Option<Notice>) =>
  Option.filter(notice, (found) => found.section === section);

export const kind_names: Record<Kind, string> = { email: "Email", google: "Google", github: "GitHub" };

const kinds: ReadonlyArray<Kind> = ["email", "google", "github"];

export type MethodRow = Data.TaggedEnum<{
  Linked: { readonly kind: Kind; readonly since: string; readonly removable: boolean };
  Unlinked: { readonly kind: Kind };
}>;

export const MethodRow = Data.taggedEnum<MethodRow>();

export const method_rows = (resp: SignInMethodsResp): ReadonlyArray<MethodRow> =>
  kinds.map((kind) =>
    Option.match(Option.fromNullishOr(resp.methods.find((method) => method.kind === kind)), {
      onNone: () => MethodRow.Unlinked({ kind }),
      onSome: (method) => MethodRow.Linked({ kind, since: method.created_at, removable: resp.methods.length > 1 }),
    }),
  );

export const live_sessions = (sessions: Snapshot["sessions"], now: number): Snapshot["sessions"] =>
  sessions
    .filter((session) => session.revoked_at === null && Date.parse(session.expires_at) > now)
    .toSorted((a, b) => Number(Boolean(b.is_current)) - Number(Boolean(a.is_current)) || Date.parse(b.created_at) - Date.parse(a.created_at));

export const session_title = (session: SessionInfo): string => {
  const browser = session.browser || "Browser";
  const device = session.device || session.device_name.trim();
  const location = session.country_code && /^[A-Z]{2}$/.test(session.country_code)
    ? ` ${String.fromCodePoint(...Array.from(session.country_code, (letter) => 127397 + letter.charCodeAt(0)))}`
    : "";
  return `${browser}${device ? ` on ${device}` : ""}${location}`;
};

export const last_active = (seen: string | null | undefined, now: number): string => {
  if (!seen) return "Last active unavailable";
  const seconds = Math.max(0, Math.floor((now - Date.parse(seen)) / 1000));
  const units = [
    { seconds: 31_536_000, unit: "year" },
    { seconds: 2_592_000, unit: "month" },
    { seconds: 86_400, unit: "day" },
    { seconds: 3_600, unit: "hour" },
    { seconds: 60, unit: "minute" },
  ] as const;
  const selected = units.find((item) => seconds >= item.seconds);
  return selected ? new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(-Math.floor(seconds / selected.seconds), selected.unit) : "Just now";
};

export type Deletion = Data.TaggedEnum<{
  None: {};
  Scheduled: { readonly purge_after: string };
}>;

export const Deletion = Data.taggedEnum<Deletion>();

export const deletion_of = (resp: DeletionStatusResp): Deletion =>
  resp.status === "pending" && resp.purge_after !== null
    ? Deletion.Scheduled({ purge_after: resp.purge_after })
    : Deletion.None();

const provider_names: Record<Provider, string> = { google: "Google", github: "GitHub" };

const provider_from = (raw: string | null): Option.Option<Provider> =>
  Option.fromNullishOr(raw).pipe(Option.filter((value): value is Provider => value === "google" || value === "github"));

export const link_notice_of = (url: URL): Option.Option<Notice> =>
  Option.orElse(
    provider_from(url.searchParams.get("linked")).pipe(
      Option.map((provider) =>
        Notice.Done({ section: "methods", message: `${provider_names[provider]} is linked. You can sign in with it now.` }),
      ),
    ),
    () =>
      provider_from(url.searchParams.get("provider")).pipe(
        Option.filter(() => url.searchParams.get("link_problem") === "elsewhere"),
        Option.map((provider) =>
          Notice.Failed({
            section: "methods",
            message: `That ${provider_names[provider]} account already signs in to another Artisan account.`,
          }),
        ),
      ),
  );

export const format_when = (iso: string): string =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export const format_day = (iso: string): string =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(iso));
