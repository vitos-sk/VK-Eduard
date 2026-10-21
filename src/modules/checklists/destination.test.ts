import { describe, expect, it } from "vitest";

import { destinationParam, parseDestination } from "./destination";

const ID = "6f1c8d2e-3b4a-4c5d-8e9f-0a1b2c3d4e5f";

describe("parseDestination", () => {
  it("разбирает чат объекта и коллегу", () => {
    expect(parseDestination(`site:${ID}`)).toEqual({ kind: "site", chatId: ID });
    expect(parseDestination(`person:${ID}`)).toEqual({ kind: "person", otherId: ID });
  });

  it("то, что отдали в адрес, разбирается обратно", () => {
    for (const destination of [
      { kind: "site", chatId: ID },
      { kind: "person", otherId: ID },
    ] as const) {
      expect(parseDestination(destinationParam(destination))).toEqual(destination);
    }
  });

  it("мусор в адресе — не «из чата»: пусто, не uuid, лишние части, неизвестный вид", () => {
    for (const raw of [undefined, null, "", "site", "site:", "site:abc", `site:${ID}:x`, `other:${ID}`, `:${ID}`]) {
      expect(parseDestination(raw)).toBeNull();
    }
  });
});
