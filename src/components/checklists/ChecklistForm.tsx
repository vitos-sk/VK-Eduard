"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
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
import { cleanItems, ITEMS_MAX, ITEM_MAX, TITLE_MAX } from "@/modules/checklists/draft";
import type { Site } from "@/modules/sites/queries";

interface Row {
  key: number;
  id: string | null;
  text: string;
}

/** Ключ строки нужен только React: не попадает в разметку, поэтому счётчик на сервере и в браузере может расходиться. */
let rowSeq = 0;
const newRow = (text = "", id: string | null = null): Row => ({ key: ++rowSeq, id, text });

interface ChecklistFormProps {
  sites: readonly Site[];
  /** Не задан — создание, задан — правка своего чеклиста. */
  initial?: { id: string; title: string; siteId: string | null; items: { id: string; text: string }[] };
}

/** `/checklists/new` и `/checklists/[id]/edit`: название, объект (необязательно), пункты, шаблоны. */
export function ChecklistForm({ sites, initial }: ChecklistFormProps) {
  const t = useT();
  const c = t.checklists;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sending, setSending] = useState(false);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [siteId, setSiteId] = useState<string | null>(initial?.siteId ?? null);
  const [rows, setRows] = useState<Row[]>(() =>
    initial ? initial.items.map((item) => newRow(item.text, item.id)) : [newRow(), newRow()],
  );
  const [isSitePickerOpen, setIsSitePickerOpen] = useState(false);

  // Куда перевести фокус после добавления строки (по Enter или кнопкой).
  const [focusKey, setFocusKey] = useState<number | null>(null);
  const inputs = useRef(new Map<number, HTMLInputElement>());

  useEffect(() => {
    if (focusKey === null) return;

    inputs.current.get(focusKey)?.focus();
    // Сбросить запрос на фокус после выполнения — как раз то, ради чего нужен эффект.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFocusKey(null);
  }, [focusKey, rows]);

  const filled = cleanItems(rows);
  const canSubmit = title.trim() !== "" && filled.length > 0;
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

  function applyTemplate(template: (typeof c.form.templateList)[number]) {
    setTitle((current) => (current.trim() === "" ? template.title : current));
    setRows((current) => {
      const blank = cleanItems(current).length === 0;
      const added = template.items.map((text) => newRow(text));

      return (blank ? added : [...current.filter((row) => row.text.trim() !== ""), ...added]).slice(0, ITEMS_MAX);
    });
  }

  function save(thenSend: boolean) {
    setSending(thenSend);

    startTransition(async () => {
      const input = { title, siteId, items: rows.map((row) => ({ id: row.id, text: row.text })) };
      const result = initial ? await updateChecklist(initial.id, input) : await createChecklist(input);

      if (result.error || !result.id) {
        toast(result.error ?? c.form.errors.save);
        return;
      }

      router.push(thenSend ? `/checklists/${result.id}?send=1` : `/checklists/${result.id}`);
    });
  }

  return (
    <div className="pb-2 lg:mx-auto lg:max-w-[640px]">
      <FormTopBar title={initial ? c.form.editTitle : c.form.createTitle} onBack={() => router.back()} />

      <div className="mt-3 space-y-3.5 px-4 lg:px-0">
        <Ticket variant="sections">
          <TicketSection>
            <UnderlineField
              label={c.form.name}
              value={title}
              maxLength={TITLE_MAX}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={c.form.namePlaceholder}
              autoFocus={!initial}
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
        {initial ? (
          <Button block onClick={() => save(false)} disabled={!canSubmit} loading={isPending}>
            {c.form.save}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 px-3" onClick={() => save(false)} disabled={!canSubmit || isPending} loading={isPending && !sending}>
              {c.form.save}
            </Button>
            <Button className="flex-1 px-3" onClick={() => save(true)} disabled={!canSubmit || isPending} loading={isPending && sending}>
              {c.form.saveAndSend}
            </Button>
          </div>
        )}
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
