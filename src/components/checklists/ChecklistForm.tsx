"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Send, X } from "lucide-react";
import { toast } from "sonner";

import { DeleteChecklistButton } from "@/components/checklists/DeleteChecklistButton";
import { FormTopBar, PickerRow } from "@/components/shared/FormParts";
import { ObjectPickerDrawer } from "@/components/time/ObjectPickerDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ticket, TicketSection } from "@/components/ui/ticket";
import { UnderlineField } from "@/components/ui/underline-field";
import { useT } from "@/lib/i18n/client";
import { postChecklistToChat } from "@/modules/chats/actions";
import { createChecklist, deleteChecklist, sendChecklist, updateChecklist } from "@/modules/checklists/actions";
import { Autosaver, type AutosaveStatus } from "@/modules/checklists/autosave";
import type { ChecklistDestination } from "@/modules/checklists/destination";
import { ITEMS_MAX, ITEM_MAX, mapItemIds, TITLE_MAX, validateDraft } from "@/modules/checklists/draft";
import type { Site } from "@/modules/sites/queries";

interface Row {
  key: number;
  id: string | null;
  text: string;
}

/** Ключ строки нужен только React: не попадает в разметку, поэтому счётчик на сервере и в браузере может расходиться. */
let rowSeq = 0;
const newRow = (text = "", id: string | null = null): Row => ({ key: ++rowSeq, id, text });

/** Состояние формы, которое уходит на сохранение. */
interface Snapshot {
  title: string;
  siteId: string | null;
  rows: Row[];
}

/** Пауза после последней правки, прежде чем сохранить: пока человек печатает, запросы не летят. */
const SAVE_DELAY_MS = 700;

/** Одинаковый ключ — одинаковое содержимое: незачем сохранять то, что уже сохранено. */
function snapshotKey(snapshot: Snapshot): string {
  return JSON.stringify([snapshot.title, snapshot.siteId, snapshot.rows.map((row) => row.text)]);
}

function validate(snapshot: Snapshot) {
  return validateDraft({ title: snapshot.title, items: snapshot.rows.map((row) => ({ id: row.id, text: row.text })) });
}

interface ChecklistFormProps {
  sites: readonly Site[];
  /** Название, которое подставляется само: у нового — «Чеклист · дата», у правки — прежнее. Его можно менять в любой момент. */
  defaultTitle: string;
  /** Создают из чата: готовый чеклист «Надіслати» отправляет прямо туда и возвращает в чат. Без него — обычная отправка. */
  destination?: ChecklistDestination | null;
  /** Не задан — создание, задан — правка своего чеклиста. */
  initial?: { id: string; title: string; siteId: string | null; items: { id: string; text: string }[] };
}

/**
 * `/checklists/new` и `/checklists/[id]/edit`: название (уже подставлено), объект (необязательно), пункты.
 * Кнопки «Зберегти» нет: форма сохраняется сама, как только есть хотя бы один пункт, и после каждой правки.
 * Внизу, в потоке страницы (не липкой панелью, чтобы ничего не перекрывать): слева «Скасувати» (новый) или «Видалити»
 * (правка), справа компактная «Надіслати».
 * Сверху видно «Зберігаємо… / Збережено»; при выходе с экрана несохранённое уходит на сервер.
 */
export function ChecklistForm({ sites, defaultTitle, initial, destination = null }: ChecklistFormProps) {
  const t = useT();
  const c = t.checklists;
  const router = useRouter();

  const [title, setTitle] = useState(initial?.title ?? defaultTitle);
  // Пока человек сам не менял название, оно выделяется целиком при фокусе: одно нажатие, и можно печатать своё.
  const [titleTouched, setTitleTouched] = useState(Boolean(initial));
  const [siteId, setSiteId] = useState<string | null>(initial?.siteId ?? null);
  const [rows, setRows] = useState<Row[]>(() =>
    initial ? initial.items.map((item) => newRow(item.text, item.id)) : [newRow(), newRow()],
  );
  const [status, setStatus] = useState<AutosaveStatus>(initial ? "saved" : "idle");
  const [sending, setSending] = useState(false);
  // Есть ли уже на сервере этот чеклист: у нового он появляется после первого автосохранения.
  const [savedId, setSavedId] = useState<string | null>(initial?.id ?? null);
  const [isSitePickerOpen, setIsSitePickerOpen] = useState(false);

  // Куда перевести фокус после добавления строки (по Enter или кнопкой).
  const [focusKey, setFocusKey] = useState<number | null>(null);
  const inputs = useRef(new Map<number, HTMLInputElement>());

  // Что уже знает сервер: id чеклиста (после первого сохранения) и id пунктов, чтобы следующая правка меняла те же пункты.
  const checklistId = useRef<string | null>(initial?.id ?? null);
  const knownItemIds = useRef(new Map<number, string>());
  const savedKey = useRef<string | null>(
    initial
      ? snapshotKey({ title: initial.title, siteId: initial.siteId, rows: initial.items.map((item) => ({ key: 0, id: item.id, text: item.text })) })
      : null,
  );

  // Автосохранитель создаётся один раз. Рефы читаются только внутри `save`, когда он вызывается после паузы,
  // а не во время отрисовки, поэтому предупреждение линтера здесь ложное.
  const [autosaver] = useState(
    // eslint-disable-next-line react-hooks/refs
    () =>
      new Autosaver<Snapshot>({
        delayMs: SAVE_DELAY_MS,
        isReady: (snapshot) => validate(snapshot).ok,
        onStatus: setStatus,
        save: async (snapshot) => {
          // Вернули форму к уже сохранённому виду: сохранять нечего.
          if (snapshotKey(snapshot) === savedKey.current) return true;

          const input = {
            title: snapshot.title,
            siteId: snapshot.siteId,
            items: snapshot.rows.map((row) => ({ id: knownItemIds.current.get(row.key) ?? row.id, text: row.text })),
          };
          const result = checklistId.current ? await updateChecklist(checklistId.current, input) : await createChecklist(input);

          if (result.error || !result.id) {
            toast(result.error ?? c.form.errors.save);
            return false;
          }

          checklistId.current = result.id;
          setSavedId(result.id);
          for (const [key, id] of mapItemIds(snapshot.rows, result.itemIds)) knownItemIds.current.set(key, id);
          savedKey.current = snapshotKey(snapshot);

          return true;
        },
      }),
  );

  // Любая правка уходит в автосохранение (после паузы).
  useEffect(() => {
    const snapshot: Snapshot = { title, siteId, rows };
    if (snapshotKey(snapshot) === savedKey.current && !autosaver.hasUnsaved) return;

    autosaver.update(snapshot);
  }, [autosaver, title, siteId, rows]);

  // Несохранённое уходит, когда человек сворачивает приложение, закрывает вкладку или уходит с экрана.
  useEffect(() => {
    const flush = () => {
      void autosaver.flush();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [autosaver]);

  useEffect(() => {
    if (focusKey === null) return;

    inputs.current.get(focusKey)?.focus();
    // Сбросить запрос на фокус после выполнения — как раз то, ради чего нужен эффект.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFocusKey(null);
  }, [focusKey, rows]);

  const check = validate({ title, siteId, rows });
  const selectedSite = siteId ? sites.find((site) => site.id === siteId) : undefined;

  function addRowAfter(index: number) {
    if (rows.length >= ITEMS_MAX) return;

    const row = newRow();
    setRows((current) => [...current.slice(0, index + 1), row, ...current.slice(index + 1)]);
    setFocusKey(row.key);
  }

  function updateRow(key: number, text: string) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, text } : row)));
  }

  function removeRow(key: number) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : [newRow()]));
  }

  async function handleBack() {
    const saved = await autosaver.flush();
    if (!saved) toast(c.form.autosave.leaveError);

    router.back();
  }

  // «Видалити» / «Скасувати»: автосохранение останавливается (иначе оно создало бы чеклист заново) и ждёт уже идущее.
  const stopAutosave = () => autosaver.discard();
  const resumeAutosave = () => {
    autosaver.resume();
    autosaver.update({ title, siteId, rows });
  };

  // «Скасувати» у нового чеклиста, который ещё не сохранился: просто назад. Если сохранение успело пройти в
  // последний момент, созданное убираем (сервер сам переводит на список).
  async function handleCancelUnsaved() {
    await autosaver.discard();

    if (checklistId.current) {
      await deleteChecklist(checklistId.current);
      return;
    }

    router.back();
  }

  async function handleSend() {
    setSending(true);

    const saved = await autosaver.flush();
    if (!saved || !checklistId.current) {
      setSending(false);
      toast(c.form.errors.save);
      return;
    }

    // Создавали из чата: отправляем прямо в него и возвращаемся туда же.
    if (destination) {
      const id = checklistId.current;
      let chatId: string;

      if (destination.kind === "site") {
        const result = await postChecklistToChat(id, destination.chatId);
        if (result.error) {
          setSending(false);
          toast(result.error);
          return;
        }

        chatId = destination.chatId;
      } else {
        const result = await sendChecklist(id, [destination.otherId]);
        if (result.error || result.chats.length === 0) {
          setSending(false);
          toast(result.error ?? c.form.errors.save);
          return;
        }

        chatId = result.chats[0].chatId;
      }

      router.push(`/chats/${chatId}`);
      return;
    }

    router.push(`/checklists/${checklistId.current}?send=1`);
  }

  const a = c.form.autosave;

  return (
    <div className="pb-2 lg:mx-auto lg:max-w-[640px]">
      <FormTopBar title={initial ? c.form.editTitle : c.form.createTitle} onBack={handleBack}>
        <p aria-live="polite" className="mt-0.5 flex min-h-5 items-center gap-1.5 text-[13px] text-ink-2">
          {status === "error" ? (
            <>
              <span className="text-err">{a.error}</span>
              <button type="button" onClick={() => void autosaver.flush()} className="font-semibold text-primary">
                {a.retry}
              </button>
            </>
          ) : !check.ok ? (
            check.reason === "title" ? (
              a.needsTitle
            ) : (
              a.needsItem
            )
          ) : status === "saved" ? (
            <>
              <Check className="size-3.5 text-ok" strokeWidth={2.4} aria-hidden />
              {a.saved}
            </>
          ) : (
            a.saving
          )}
        </p>
      </FormTopBar>

      <div className="mt-3 space-y-3.5 px-4 lg:px-0">
        <Ticket variant="sections">
          <TicketSection>
            <UnderlineField
              label={c.form.name}
              value={title}
              maxLength={TITLE_MAX}
              onChange={(event) => {
                setTitle(event.target.value);
                setTitleTouched(true);
              }}
              // Подставленное название выделяется целиком: одно нажатие, и можно печатать своё.
              onFocus={(event) => {
                if (!titleTouched) event.currentTarget.select();
              }}
              // Пустое название не оставляем: возвращаем подставленное.
              onBlur={() => {
                if (title.trim() === "") {
                  setTitle(initial?.title ?? defaultTitle);
                  setTitleTouched(Boolean(initial));
                }
              }}
              placeholder={c.form.namePlaceholder}
              enterKeyHint="next"
            />
          </TicketSection>

          <PickerRow
            label={c.form.site}
            value={selectedSite?.name ?? null}
            placeholder={c.form.siteNone}
            onClick={() => setIsSitePickerOpen(true)}
          />
        </Ticket>

        <Ticket variant="sections">
          <TicketSection>
            <span className="text-[12px] text-ink-2">{c.form.items}</span>

            <ul className="mt-2 flex flex-col gap-2">
              {rows.map((row, index) => (
                <li key={row.key} className="flex items-center gap-2">
                  <Input
                    size="sm"
                    ref={(node) => {
                      if (node) inputs.current.set(row.key, node);
                      else inputs.current.delete(row.key);
                    }}
                    value={row.text}
                    maxLength={ITEM_MAX}
                    placeholder={c.form.itemPlaceholder}
                    aria-label={`${c.form.itemPlaceholder} ${index + 1}`}
                    autoFocus={!initial && index === 0}
                    enterKeyHint="next"
                    onChange={(event) => updateRow(row.key, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addRowAfter(index);
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-ink-2"
                    onClick={() => removeRow(row.key)}
                    aria-label={c.form.removeItem}
                  >
                    <X className="size-[18px]" strokeWidth={1.9} aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>

            {rows.length < ITEMS_MAX && (
              <Button variant="ghost" size="sm" className="mt-2 -ml-2 px-2" onClick={() => addRowAfter(rows.length - 1)}>
                <Plus className="size-4" strokeWidth={1.9} aria-hidden />
                {c.form.addItem}
              </Button>
            )}
          </TicketSection>
        </Ticket>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 px-4 lg:px-0">
        {savedId ? (
          // Уже сохранено (правка или новый после автосохранения): красная кнопка с подтверждением.
          <DeleteChecklistButton
            checklistId={savedId}
            label={initial ? undefined : c.form.cancel}
            texts={
              initial
                ? undefined
                : { title: c.form.cancelTitle, body: c.form.cancelBody, confirm: c.form.cancelConfirm, keep: c.form.cancelKeep }
            }
            onStart={stopAutosave}
            onFail={resumeAutosave}
          />
        ) : (
          <Button variant="outline" size="sm" onClick={() => void handleCancelUnsaved()}>
            {c.form.cancel}
          </Button>
        )}

        <Button size="sm" onClick={handleSend} disabled={!check.ok} loading={sending}>
          <Send className="size-4" strokeWidth={1.9} aria-hidden />
          {destination ? t.checklists.send.toChat : c.view.send}
        </Button>
      </div>

      <ObjectPickerDrawer
        open={isSitePickerOpen}
        onOpenChange={setIsSitePickerOpen}
        sites={sites}
        value={siteId}
        onSelect={setSiteId}
        onClear={() => setSiteId(null)}
        clearLabel={c.form.siteNone}
      />
    </div>
  );
}
