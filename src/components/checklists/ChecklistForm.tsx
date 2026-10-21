"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Send, X } from "lucide-react";
import { toast } from "sonner";

import { FormTopBar, PickerRow, StickyActionBar } from "@/components/shared/FormParts";
import { ObjectPickerDrawer } from "@/components/time/ObjectPickerDrawer";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Ticket, TicketSection } from "@/components/ui/ticket";
import { UnderlineField } from "@/components/ui/underline-field";
import { useT } from "@/lib/i18n/client";
import { createChecklist, updateChecklist } from "@/modules/checklists/actions";
import { Autosaver, type AutosaveStatus } from "@/modules/checklists/autosave";
import { applyTemplateItems, ITEMS_MAX, ITEM_MAX, mapItemIds, TITLE_MAX, validateDraft } from "@/modules/checklists/draft";
import type { Site } from "@/modules/sites/queries";

interface Row {
  key: number;
  id: string | null;
  text: string;
  /** Пункт пришёл из шаблона и не правился: следующий шаблон его заменит. Правка руками делает пункт «своим». */
  fromTemplate: boolean;
}

/** Ключ строки нужен только React: не попадает в разметку, поэтому счётчик на сервере и в браузере может расходиться. */
let rowSeq = 0;
const newRow = (text = "", id: string | null = null, fromTemplate = false): Row => ({ key: ++rowSeq, id, text, fromTemplate });

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
  /** Не задан — создание, задан — правка своего чеклиста. */
  initial?: { id: string; title: string; siteId: string | null; items: { id: string; text: string }[] };
}

/**
 * `/checklists/new` и `/checklists/[id]/edit`: название (уже подставлено), объект (необязательно), пункты, шаблоны.
 * Кнопки «Зберегти» нет: форма сохраняется сама, как только есть хотя бы один пункт, и после каждой правки.
 * Сверху видно «Зберігаємо… / Збережено»; при выходе с экрана несохранённое уходит на сервер.
 */
export function ChecklistForm({ sites, defaultTitle, initial }: ChecklistFormProps) {
  const t = useT();
  const c = t.checklists;
  const router = useRouter();

  const [title, setTitle] = useState(initial?.title ?? defaultTitle);
  // Пока человек сам не менял название, шаблон может подставить своё.
  const [titleTouched, setTitleTouched] = useState(Boolean(initial));
  const [siteId, setSiteId] = useState<string | null>(initial?.siteId ?? null);
  const [rows, setRows] = useState<Row[]>(() =>
    initial ? initial.items.map((item) => newRow(item.text, item.id)) : [newRow(), newRow()],
  );
  const [status, setStatus] = useState<AutosaveStatus>(initial ? "saved" : "idle");
  const [sending, setSending] = useState(false);
  const [isSitePickerOpen, setIsSitePickerOpen] = useState(false);

  // Куда перевести фокус после добавления строки (по Enter или кнопкой).
  const [focusKey, setFocusKey] = useState<number | null>(null);
  const inputs = useRef(new Map<number, HTMLInputElement>());

  // Что уже знает сервер: id чеклиста (после первого сохранения) и id пунктов, чтобы следующая правка меняла те же пункты.
  const checklistId = useRef<string | null>(initial?.id ?? null);
  const knownItemIds = useRef(new Map<number, string>());
  const savedKey = useRef<string | null>(
    initial
      ? snapshotKey({ title: initial.title, siteId: initial.siteId, rows: initial.items.map((item) => ({ key: 0, id: item.id, text: item.text, fromTemplate: false })) })
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
    setRows((current) => current.map((row) => (row.key === key ? { ...row, text, fromTemplate: false } : row)));
  }

  function removeRow(key: number) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : [newRow()]));
  }

  function applyTemplate(template: (typeof c.form.templateList)[number]) {
    if (!titleTouched) setTitle(template.title);
    // Шаблон заменяет прошлый шаблон, а не дописывается: пункты, вписанные руками, остаются.
    setRows((current) =>
      applyTemplateItems(
        current,
        template.items.map((text) => newRow(text, null, true)),
      ),
    );
  }

  async function handleBack() {
    const saved = await autosaver.flush();
    if (!saved) toast(c.form.autosave.leaveError);

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

        {!initial && (
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink-2">{c.form.templates}</p>
            <div className="flex flex-wrap gap-1.5">
              {c.form.templateList.map((template) => (
                <Chip key={template.label} onClick={() => applyTemplate(template)}>
                  {template.label}
                </Chip>
              ))}
            </div>
          </div>
        )}

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

      <StickyActionBar>
        <Button block onClick={handleSend} disabled={!check.ok} loading={sending}>
          <Send className="size-[18px]" strokeWidth={1.9} aria-hidden />
          {c.view.send}
        </Button>
      </StickyActionBar>

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
