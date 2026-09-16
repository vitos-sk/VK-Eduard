import { describe, expect, it } from "vitest";

import { buildWorkerHoursList } from "./hours";

describe("buildWorkerHoursList", () => {
  it("сортує робітників компанії за спаданням годин", () => {
    const workers = [
      { id: "w1", full_name: "Іван" },
      { id: "w2", full_name: "Петро" },
    ];
    const entries = [
      { author_id: "w1", total_minutes: 120 },
      { author_id: "w2", total_minutes: 480 },
      { author_id: "w2", total_minutes: 60 },
    ];

    expect(buildWorkerHoursList(workers, entries)).toEqual([
      { id: "w2", name: "Петро", minutes: 540 },
      { id: "w1", name: "Іван", minutes: 120 },
    ]);
  });

  it("включає робітників без жодного запису за період — з 0 хвилин", () => {
    const workers = [
      { id: "w1", full_name: "Іван" },
      { id: "w2", full_name: "Петро" },
    ];
    const entries = [{ author_id: "w1", total_minutes: 100 }];

    expect(buildWorkerHoursList(workers, entries)).toEqual([
      { id: "w1", name: "Іван", minutes: 100 },
      { id: "w2", name: "Петро", minutes: 0 },
    ]);
  });

  it("ігнорує записи авторів поза списком робітників (звільнені)", () => {
    const workers = [{ id: "w1", full_name: "Іван" }];
    const entries = [
      { author_id: "w1", total_minutes: 100 },
      { author_id: "ghost", total_minutes: 999 },
    ];

    expect(buildWorkerHoursList(workers, entries)).toEqual([
      { id: "w1", name: "Іван", minutes: 100 },
    ]);
  });

  it("трактує total_minutes: null як 0", () => {
    const workers = [{ id: "w1", full_name: "Іван" }];
    const entries = [{ author_id: "w1", total_minutes: null }];

    expect(buildWorkerHoursList(workers, entries)).toEqual([
      { id: "w1", name: "Іван", minutes: 0 },
    ]);
  });
});
