import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { tokens } from "./tokens";

const css = readFileSync(join(__dirname, "tokens.css"), "utf8");

function cssValue(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`Токен --${name} не найден в tokens.css`);
  return match[1].trim();
}

describe("tokens.ts совпадает с tokens.css", () => {
  const pairs: [keyof typeof tokens, string][] = [
    ["paper", "paper"],
    ["ticket", "ticket"],
    ["stub", "stub"],
    ["edge", "edge"],
    ["perf", "perf"],
    ["ink", "ink"],
    ["ink2", "ink-2"],
    ["ink3", "ink-3"],
    ["green", "green"],
    ["yellow", "yellow"],
    ["warn", "warn"],
    ["err", "err"],
  ];

  it.each(pairs)("%s", (key, cssName) => {
    expect(tokens[key]).toBe(cssValue(cssName));
  });
});

describe("tokens.css", () => {
  it("не содержит теней и градиентов", () => {
    expect(css).not.toMatch(/gradient\(/);
  });
});
