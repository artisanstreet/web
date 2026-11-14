import { Option } from "effect";
import { describe, expect, it } from "vitest";
import { Download, download_for, machine_of, release_page } from "../../../src/lib/download/machine.ts";

const chrome_windows = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
const firefox_windows = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0";
const safari_mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15";
const firefox_linux = "Mozilla/5.0 (X11; Linux x86_64; rv:146.0) Gecko/20100101 Firefox/146.0";
const chrome_android = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36";

const x64 = Download.Binary({ url: "https://github.com/artisanstreet/editor/releases/download/nightly/Artisan-Editor-x86_64.exe" });
const arm64 = Download.Binary({ url: "https://github.com/artisanstreet/editor/releases/download/nightly/Artisan-Editor-aarch64.exe" });

const resolve = (platform: string | undefined, arch: string | undefined, user_agent: string, hinted = false) =>
  download_for(machine_of({ platform: Option.fromNullishOr(platform), arch: Option.fromNullishOr(arch), user_agent }), hinted);

describe("editor download", () => {
  it.each([
    ['"arm"', arm64],
    ['"x86"', x64],
  ])("picks the Windows build from a Chromium arch hint of %s", (arch, expected) => {
    expect(resolve('"Windows"', arch, chrome_windows)).toEqual(expected);
  });

  it("asks Chromium for the arch hint once before guessing", () => {
    expect(resolve('"Windows"', undefined, chrome_windows)).toEqual(Download.AskForHints());
    expect(resolve('"Windows"', undefined, chrome_windows, true)).toEqual(x64);
    expect(resolve('"Windows"', '""', chrome_windows, true)).toEqual(x64);
  });

  it("falls back to x64 for Windows browsers without client hints", () => {
    expect(resolve(undefined, undefined, firefox_windows)).toEqual(x64);
  });

  it("trusts an explicit ARM64 token in the user agent", () => {
    expect(resolve(undefined, undefined, "Mozilla/5.0 (Windows NT 10.0; ARM64) Example/1.0")).toEqual(arm64);
  });

  it.each([
    ['"macOS"', safari_mac],
    [undefined, safari_mac],
    [undefined, firefox_linux],
    ['"Linux"', firefox_linux],
    ['"Android"', chrome_android],
  ])("sends %s %s to the release page", (platform, user_agent) => {
    expect(resolve(platform, undefined, user_agent)).toEqual(Download.ReleasePage({ url: release_page }));
  });
});
