import { isUuid } from "@/lib/uuid";

/**
 * Куда уйдёт чеклист, созданный «из чата» (скрепка → «Створити новий чеклист»): в чат объекта или коллеге в чат 1 на 1.
 * Едет в адресе `/checklists/new?to=…`, поэтому разбирается строго: чужое значение — просто «не из чата».
 */
export type ChecklistDestination = { kind: "site"; chatId: string } | { kind: "person"; otherId: string };

export function destinationParam(destination: ChecklistDestination): string {
  return destination.kind === "site" ? `site:${destination.chatId}` : `person:${destination.otherId}`;
}

export function parseDestination(raw: string | null | undefined): ChecklistDestination | null {
  if (!raw) return null;

  const [kind, id, ...rest] = raw.split(":");
  if (!id || rest.length > 0 || !isUuid(id)) return null;

  if (kind === "site") return { kind: "site", chatId: id };
  if (kind === "person") return { kind: "person", otherId: id };

  return null;
}
