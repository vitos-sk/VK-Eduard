import { describe, expect, it } from "vitest";

import { EMPTY_FILTER_STAT, tallyEntries } from "@/modules/entries/filterStats";

interface Row {
  author_id: string;
  site_id: string | null;
  total_minutes: number | null;
}

const rows: Row[] = [
  { author_id: "ivan", site_id: "trap", total_minutes: 510 },
  { author_id: "ivan", site_id: "trap", total_minutes: 500 },
  { author_id: "eduard", site_id: "rey", total_minutes: 585 },
  { author_id: "oleh", site_id: null, total_minutes: null },
];

describe("tallyEntries", () => {
  it("считает смены и минуты по сотрудникам и общий итог", () => {
    const stats = tallyEntries(rows, (row) => row.author_id);

    expect(stats.total).toEqual({ shifts: 4, minutes: 1595 });
    expect(stats.byKey.get("ivan")).toEqual({ shifts: 2, minutes: 1010 });
    expect(stats.byKey.get("eduard")).toEqual({ shifts: 1, minutes: 585 });
  });

  it("смена, которая ещё идёт, — это смена с 0 минут", () => {
    const stats = tallyEntries(rows, (row) => row.author_id);

    expect(stats.byKey.get("oleh")).toEqual({ shifts: 1, minutes: 0 });
  });

  it("смены без объекта попадают только в общий итог", () => {
    const stats = tallyEntries(rows, (row) => row.site_id);

    expect(stats.total.shifts).toBe(4);
    expect(stats.byKey.get("trap")).toEqual({ shifts: 2, minutes: 1010 });
    expect([...stats.byKey.keys()].sort()).toEqual(["rey", "trap"]);
  });

  it("для пустого списка — нули, а отсутствующий ключ даёт пустой итог", () => {
    const stats = tallyEntries<Row>([], (row) => row.author_id);

    expect(stats.total).toEqual(EMPTY_FILTER_STAT);
    expect(stats.byKey.size).toBe(0);
  });
});
