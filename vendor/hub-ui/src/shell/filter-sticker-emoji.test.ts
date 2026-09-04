import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FILTER_BAR_SEMANTIC_KEY } from "./filter-semantic-keys";
import {
  hubFilterEmojiToneClass,
  hubFilterEmojiUsesColorPresentation,
} from "./filter-dropdown-primitives";

const stylesDir = join(dirname(fileURLToPath(import.meta.url)), "../styles");

describe("directory filter sticker SSOT", () => {
  it("does not map locale/gender/transition/effect onto colored Lucide facets", () => {
    expect(FILTER_BAR_SEMANTIC_KEY.locale).toBeUndefined();
    expect(FILTER_BAR_SEMANTIC_KEY.gender).toBeUndefined();
    expect(FILTER_BAR_SEMANTIC_KEY.transition).toBeUndefined();
    expect(FILTER_BAR_SEMANTIC_KEY.effect).toBeUndefined();
  });

  it("treats flags, globes, and pictorial stickers as color emoji; ♀ stays a text dingbat", () => {
    expect(hubFilterEmojiUsesColorPresentation("🇻🇳")).toBe(true);
    expect(hubFilterEmojiUsesColorPresentation("🌐")).toBe(true);
    expect(hubFilterEmojiUsesColorPresentation("🌏")).toBe(true);
    expect(hubFilterEmojiUsesColorPresentation("💎")).toBe(true);
    expect(hubFilterEmojiUsesColorPresentation("👥")).toBe(true);
    expect(hubFilterEmojiUsesColorPresentation("♀")).toBe(false);
    expect(hubFilterEmojiToneClass("♀")).toBe("hub-filter-option-emoji--sticker");
    expect(hubFilterEmojiToneClass("🇻🇳")).toBe("hub-filter-option-emoji--color");
    expect(hubFilterEmojiToneClass("🌐")).toBe("hub-filter-option-emoji--color");
    expect(hubFilterEmojiToneClass("✨")).toBe("hub-filter-option-emoji--color");
  });

  it("directory headers use color emoji, not Segoe Symbol outlines", () => {
    const css = readFileSync(join(stylesDir, "hub-inline-emoji.css"), "utf8");
    expect(css).toMatch(/\.hub-users-th-emoji[\s\S]*?font-variant-emoji:\s*emoji/);
    expect(css).not.toMatch(/\.hub-users-th-emoji,\s*\n\.hub-filter-option-emoji--sticker/);
    expect(css).toContain("Segoe UI Emoji");
    expect(css).toMatch(/\.hub-filter-option-emoji[\s\S]*?display:\s*inline-flex/);
    expect(css).toContain("translateY(-1.5px)");
    const fields = readFileSync(join(stylesDir, "hub-fields.css"), "utf8");
    expect(fields).toMatch(/\.hub-filter-clear-btn__icon[\s\S]*?translateY\(-2px\)/);
  });

  it("exposes hub-inline-gap-name on the shell layout stack P0021 already imports", () => {
    const css = readFileSync(join(stylesDir, "hub-shell-layout.css"), "utf8");
    expect(css).toContain(".hub-inline-gap-name");
    expect(css).toContain("--hub-inline-gap-name: 8px");
  });
});
