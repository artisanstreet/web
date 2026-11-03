import { Option } from "effect";

const app_path = /^\/[a-z0-9/_-]*$/i;

const path_of = (value: string) => value.split(/[?#]/)[0] ?? "";

const is_safe_path = (value: string) => !value.startsWith("//") && app_path.test(path_of(value));

const same_origin_path = (origin: string) => (candidate: string) =>
  Option.fromNullishOr(URL.parse(candidate)).pipe(
    Option.filter((url) => url.origin === URL.parse(origin)?.origin),
    Option.map((url) => `${url.pathname}${url.search}`),
  );

export const parse_return_to =
  (dashboard_origin: string) =>
  (raw: string | null | undefined): Option.Option<string> =>
    Option.fromNullishOr(raw).pipe(
      Option.map((value) => value.trim()),
      Option.filter((value) => value.length > 0 && value.length <= 512),
      Option.flatMap((value) =>
        /^https?:\/\//i.test(value) ? same_origin_path(dashboard_origin)(value) : Option.some(value),
      ),
      Option.filter(is_safe_path),
    );

export const dashboard_url = (dashboard_origin: string, return_to: string | null | undefined): string =>
  `${dashboard_origin.replace(/\/+$/, "")}${Option.getOrElse(parse_return_to(dashboard_origin)(return_to), () => "/")}`;
