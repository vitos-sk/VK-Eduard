import { describe, expect, it } from "vitest";

import { classifyInsertError } from "./outbox-rules";

describe("classifyInsertError", () => {
  it("успех — отправлено", () => {
    expect(classifyInsertError(null, true)).toBe("sent");
  });

  it("запись с таким client_id уже есть — считаем отправленной, дубля не будет", () => {
    expect(classifyInsertError({ code: "23505", message: "duplicate key" }, true)).toBe("sent");
  });

  it("нет сети — оставляем в очереди", () => {
    expect(classifyInsertError({ message: "TypeError: Failed to fetch" }, true)).toBe("offline");
    expect(classifyInsertError({ code: "42501", message: "denied" }, false)).toBe("offline");
  });

  it("сервер отверг запись — это не «нет сети»", () => {
    expect(classifyInsertError({ code: "42501", message: "new row violates row-level security" }, true)).toBe("rejected");
  });
});
