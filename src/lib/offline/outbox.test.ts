import { describe, expect, it } from "vitest";

import { classifyInsertError, shouldCreateReport } from "./outbox-rules";

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

describe("shouldCreateReport", () => {
  it("время с описанием и ключом звіту — в очереди создаём и звіт", () => {
    expect(shouldCreateReport({ description: "Поклали плитку", reportClientId: "r-1" })).toBe(true);
  });

  it("без описания (или только пробелы) звіту нет", () => {
    expect(shouldCreateReport({ description: "", reportClientId: "r-1" })).toBe(false);
    expect(shouldCreateReport({ description: "   ", reportClientId: "r-1" })).toBe(false);
  });

  it("запись, которая встала в очередь до появления звітів (нет ключа), уходит как раньше — одним временем", () => {
    expect(shouldCreateReport({ description: "Поклали плитку" })).toBe(false);
  });
});
