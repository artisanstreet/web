import { Data, Option, pipe } from "effect";

export type Arch = Data.TaggedEnum<{
  X64: {};
  Arm64: {};
}>;

export const Arch = Data.taggedEnum<Arch>();

export type Machine = Data.TaggedEnum<{
  Windows: { readonly arch: Option.Option<Arch>; readonly sends_hints: boolean };
  Other: {};
}>;

export const Machine = Data.taggedEnum<Machine>();

export type Download = Data.TaggedEnum<{
  Binary: { readonly url: string };
  AskForHints: {};
  ReleasePage: { readonly url: string };
}>;

export const Download = Data.taggedEnum<Download>();

export interface Signals {
  readonly platform: Option.Option<string>;
  readonly arch: Option.Option<string>;
  readonly user_agent: string;
}

const release = "https://github.com/artisanstreet/editor/releases";

export const release_page = `${release}/tag/nightly`;

const binary_url = (arch: Arch) =>
  `${release}/download/nightly/Artisan-Editor-${Arch.$match(arch, { X64: () => "x86_64", Arm64: () => "aarch64" })}.exe`;

const hint_value = (value: string) => value.trim().replace(/^"|"$/g, "").toLowerCase();

const arch_of = (signals: Signals): Option.Option<Arch> =>
  pipe(
    signals.arch,
    Option.map(hint_value),
    Option.filter((value) => value !== ""),
    Option.map((value) => (value === "arm" ? Arch.Arm64() : Arch.X64())),
    Option.orElse(() => (/\b(arm64|aarch64)\b/i.test(signals.user_agent) ? Option.some(Arch.Arm64()) : Option.none())),
  );

export const machine_of = (signals: Signals): Machine =>
  Option.match(signals.platform, {
    onSome: (platform) =>
      hint_value(platform) === "windows" ? Machine.Windows({ arch: arch_of(signals), sends_hints: true }) : Machine.Other(),
    onNone: () =>
      /\bWindows NT\b/.test(signals.user_agent) ? Machine.Windows({ arch: arch_of(signals), sends_hints: false }) : Machine.Other(),
  });

export const download_for = (machine: Machine, hinted: boolean): Download =>
  Machine.$match(machine, {
    Windows: ({ arch, sends_hints }) =>
      Option.match(arch, {
        onSome: (known) => Download.Binary({ url: binary_url(known) }),
        onNone: () => (sends_hints && !hinted ? Download.AskForHints() : Download.Binary({ url: binary_url(Arch.X64()) })),
      }),
    Other: () => Download.ReleasePage({ url: release_page }),
  });
