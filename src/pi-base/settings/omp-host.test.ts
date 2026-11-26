/**
 * The settings modal on omp (19.2+). omp passes `ctx.ui.custom` factories a
 * UI host (`requestRender`, `size`, `suspend`) instead of pi's TUI, and its
 * coding-agent shim no longer exports `getSelectListTheme` or
 * `getMarkdownTheme`. The mock below gives the modules under test that
 * reduced coding-agent surface.
 */

import { describe, expect, it, vi } from "vitest";
import type * as CodingAgent from "@earendil-works/pi-coding-agent";
import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import type { UiHost } from "./host.ts";

vi.mock("@earendil-works/pi-coding-agent", async (importOriginal) => {
  const {
    getSelectListTheme: _getSelectListTheme,
    getMarkdownTheme: _getMarkdownTheme,
    ...ompShim
  } = await importOriginal<typeof CodingAgent>();
  return ompShim;
});

import { createSettingsModalBody } from "./body.ts";
import type { Field } from "./types.ts";

function ompUiHost(rows: number): UiHost {
  return {
    requestRender: vi.fn(),
    size: () => ({ columns: 100, rows }),
  };
}

function piTui(rows: number): TUI {
  return { terminal: { rows, columns: 100 }, requestRender: vi.fn() } as unknown as TUI;
}

/** Wraps colored text in `<color>` tags so tests can see which theme color styled it. */
function taggingTheme(): Theme {
  const plain = (text: string): string => text;
  return {
    fg: (color: string, text: string) => `<${color}>${text}</${color}>`,
    bg: (_color: string, text: string) => text,
    bold: plain,
    italic: plain,
    underline: plain,
    inverse: plain,
    strikethrough: plain,
  } as unknown as Theme;
}

function fakeCtx(): ExtensionContext {
  return {
    ui: { notify: vi.fn() },
    modelRegistry: { getAvailable: () => [], find: () => undefined },
  } as unknown as ExtensionContext;
}

const manyBooleans: Field[] = Array.from({ length: 60 }, (_, i) => ({
  key: `flag${i}`,
  type: "boolean",
  label: `Flag ${i}`,
  value: false,
}));

const voiceField: Field = {
  key: "voice",
  type: "enum",
  label: "Voice",
  value: "Zephyr",
  options: ["Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda"],
};

const notesField: Field = {
  key: "notes",
  type: "text",
  label: "Notes",
  value: "first line\nsecond line",
};

describe("settings modal inside omp's UI host", () => {
  it("sizes the modal from the host's size() like pi's terminal rows", () => {
    const render = (tui: TUI | UiHost) =>
      createSettingsModalBody(
        { fields: manyBooleans },
        { tui, theme: taggingTheme(), ctx: fakeCtx(), close: vi.fn() },
      ).render(80).length;

    expect(render(ompUiHost(60))).toBe(render(piTui(60)));
    expect(render(ompUiHost(60))).toBeGreaterThan(render(piTui(24)));
  });

  it("styles the enum submenu's selected option with the host theme's accent", () => {
    const body = createSettingsModalBody(
      { fields: [voiceField] },
      { tui: ompUiHost(40), theme: taggingTheme(), ctx: fakeCtx(), close: vi.fn() },
    );
    body.render(80);
    body.handleInput?.("\r"); // open submenu

    expect(body.render(80).join("\n")).toMatch(/<accent>[^<]*Zephyr/);
  });

  it("opens the text field's editor with the current value", () => {
    const body = createSettingsModalBody(
      { fields: [notesField] },
      { tui: ompUiHost(40), theme: taggingTheme(), ctx: fakeCtx(), close: vi.fn() },
    );
    body.render(80);
    body.handleInput?.("\r"); // open editor submenu

    const submenu = body.render(80).join("\n");
    expect(submenu).toContain("second line");
  });
});
