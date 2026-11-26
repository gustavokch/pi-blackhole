/**
 * Host differences the settings and changelog views absorb. omp (19.2+)
 * passes `ctx.ui.custom` factories a UI host instead of pi's TUI, and its
 * coding-agent shim no longer exports pi's `getSelectListTheme`.
 */

import type { Theme } from "@earendil-works/pi-coding-agent";
import type { SelectListTheme, TUI } from "@earendil-works/pi-tui";

/** What omp hands a `ctx.ui.custom` factory where pi hands its TUI. */
export interface UiHost {
  requestRender(): void;
  size(): { columns: number; rows: number };
}

/**
 * pi's TUI as is, or a stand-in over omp's UI host carrying the only TUI
 * members these views and pi-tui's Editor read: `requestRender()` and
 * `terminal.rows` / `terminal.columns`.
 */
export function hostTui(tui: TUI | UiHost): TUI {
  if ("terminal" in tui) return tui;
  const host = tui;
  return {
    requestRender: () => host.requestRender(),
    get terminal() {
      return host.size();
    },
  } as unknown as TUI;
}

/** pi's `getSelectListTheme()` styling, drawn from the theme the host passed in. */
export function selectListTheme(theme: Theme): SelectListTheme {
  const accent = (text: string): string => theme.fg("accent", text);
  const muted = (text: string): string => theme.fg("muted", text);
  return {
    selectedPrefix: accent,
    selectedText: accent,
    description: muted,
    scrollInfo: muted,
    noMatch: muted,
  };
}
