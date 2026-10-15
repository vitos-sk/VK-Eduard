import { describe, expect, it } from "vitest";

import { WHATSAPP_MAX_ITEMS, buildShareMessage, whatsAppUrl } from "./whatsapp";

const texts = {
  openInApp: "Відкрити в додатку:",
  moreItems: "… ще {n}",
  linkOnly: "Чеклист «{title}», {count}",
};

const base = {
  title: "Перед виїздом",
  siteName: "Плоский дах — Гент",
  items: ["Заправити бус", "Газовий пальник"],
  countLabel: "2 пункти",
  url: "https://vk.example/c/8fa2c91d0b3e7a64",
  format: "text" as const,
};

describe("buildShareMessage: текстом", () => {
  it("название жирным, объект, пункты с квадратиками и ссылка внизу", () => {
    expect(buildShareMessage(base, texts)).toBe(
      [
        "*Перед виїздом* · Плоский дах — Гент",
        "☐ Заправити бус",
        "☐ Газовий пальник",
        "",
        "Відкрити в додатку:",
        "https://vk.example/c/8fa2c91d0b3e7a64",
      ].join("\n"),
    );
  });

  it("без объекта — только название", () => {
    expect(buildShareMessage({ ...base, siteName: null }, texts).split("\n")[0]).toBe("*Перед виїздом*");
  });

  it("длинный список обрезается и показывает, сколько пунктов не поместилось", () => {
    const items = Array.from({ length: WHATSAPP_MAX_ITEMS + 5 }, (_, index) => `Пункт ${index + 1}`);
    const message = buildShareMessage({ ...base, items }, texts);

    expect(message.split("\n").filter((line) => line.startsWith("☐"))).toHaveLength(WHATSAPP_MAX_ITEMS);
    expect(message).toContain("… ще 5");
    expect(message).not.toContain(`Пункт ${WHATSAPP_MAX_ITEMS + 1}`);
  });

  it("звёздочки и подчёркивания из названия не ломают разметку", () => {
    const message = buildShareMessage({ ...base, title: "*Важно* _срочно_" }, texts);

    expect(message.split("\n")[0]).toBe("*Важно срочно* · Плоский дах — Гент");
  });
});

describe("buildShareMessage: только ссылкой", () => {
  it("короткое сообщение: название, число пунктов и ссылка", () => {
    expect(buildShareMessage({ ...base, format: "link" }, texts)).toBe(
      "Чеклист «Перед виїздом», 2 пункти\nhttps://vk.example/c/8fa2c91d0b3e7a64",
    );
  });

  it("список пунктов в такое сообщение не попадает", () => {
    expect(buildShareMessage({ ...base, format: "link" }, texts)).not.toContain("☐");
  });
});

describe("whatsAppUrl", () => {
  it("кодирует текст для адреса, переносы строк сохраняются", () => {
    const url = whatsAppUrl("*Бус*\n☐ Один & два");

    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(url).toContain("%0A");
    expect(url).toContain("%26");
    expect(decodeURIComponent(url.replace("https://wa.me/?text=", ""))).toBe("*Бус*\n☐ Один & два");
  });
});
