"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Send } from "lucide-react";
import { toast } from "sonner";

import { DeleteChecklistButton } from "@/components/checklists/DeleteChecklistButton";
import { SendChecklistSheet } from "@/components/checklists/SendChecklistSheet";
import { BackHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/button";
import { CheckMark } from "@/components/ui/checkbox";
import { ProgressPips } from "@/components/ui/progress-pips";
import { Ticket, TicketSection } from "@/components/ui/ticket";
import { fmt } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import type { Colleague } from "@/modules/chats/queries";
import { setItemDone } from "@/modules/checklists/actions";
import { countProgress, doneByOther, isComplete } from "@/modules/checklists/progress";
import type { ChecklistDetail, ChecklistItemView } from "@/modules/checklists/queries";

interface ChecklistViewProps {
  detail: ChecklistDetail;
  /** Кто смотрит: его собственные отметки не подписываются именем. */
  meId: string;
  /** Свой чеклист: править, удалять, отправлять. Копию коллеги, открытую из чата, можно только отмечать (это разрешено обоим). */
  isOwner: boolean;
  colleagues: Colleague[];
  /** Открыть лист «Надіслати» сразу (после «Зберегти й надіслати»). */
  openSend: boolean;
}

/** `/checklists/[id]`: пункты с галочками и прогрессом; внизу, в потоке страницы, «Видалити» и компактная «Надіслати». */
export function ChecklistView({ detail, meId, isOwner, colleagues, openSend }: ChecklistViewProps) {
  const t = useT();
  const v = t.checklists.view;
  const router = useRouter();

  const [items, setItems] = useState(detail.items);
  const [sendOpen, setSendOpen] = useState(openSend);

  function handleSendOpenChange(open: boolean) {
    setSendOpen(open);

    // Пришли с `?send=1` («Надіслати» в форме): закрыли окно — убираем параметр, чтобы возврат на страницу его не открывал снова.
    if (!open && openSend) router.replace(`/checklists/${detail.id}`);
  }
  // Пункты, по которым запрос ещё идёт: повторное нажатие в это время игнорируем, чтобы ответы не перепутались.
  const busy = useRef(new Set<string>());

  const progress = countProgress(items.map((item) => ({ done_at: item.doneAt })));
  const complete = isComplete(progress);

  async function handleToggle(itemId: string) {
    if (busy.current.has(itemId)) return;

    const before = items.find((item) => item.id === itemId);
    if (!before) return;

    const nextDone = before.doneAt === null;
    const mark = (patch: Pick<ChecklistItemView, "doneAt" | "doneById" | "doneByName">) =>
      setItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
    const restore = () => mark({ doneAt: before.doneAt, doneById: before.doneById, doneByName: before.doneByName });

    busy.current.add(itemId);
    // Новая отметка — моя (имя под ней не показывается), снятая — без времени и имени.
    mark(nextDone ? { doneAt: new Date().toISOString(), doneById: meId, doneByName: null } : { doneAt: null, doneById: null, doneByName: null });

    try {
      const result = await setItemDone(itemId, nextDone);

      if (result.error) {
        restore();
        toast(result.error);
      }
    } catch {
      restore();
      toast(v.toggleError);
    } finally {
      busy.current.delete(itemId);
    }
  }

  const subtitle = isOwner
    ? [detail.isReceived ? (detail.senderName ? fmt(v.fromLine, { name: detail.senderName }) : null) : v.mineLine, detail.siteName]
    : [fmt(v.readOnlyLine, { name: detail.ownerName }), detail.siteName];

  return (
    <div className="pb-2 lg:mx-auto lg:max-w-[640px]">
      <BackHeader
        title={detail.title}
        href="/checklists"
        action={
          isOwner && !detail.isReceived ? (
            <Button asChild variant="ghost" size="icon-sm" className="text-text-muted">
              <Link href={`/checklists/${detail.id}/edit`} aria-label={v.edit} title={v.edit}>
                <Pencil className="size-[18px]" strokeWidth={1.9} aria-hidden />
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="space-y-3 px-4 lg:px-0">
        <p className="text-[13px] text-ink-2">{subtitle.filter(Boolean).join(" · ")}</p>

        <Ticket variant="flat" className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[14px] font-semibold">{complete ? v.allDone : v.done}</span>
            <span className="tabular text-[15px] font-semibold">{fmt(v.progress, { done: progress.done, total: progress.total })}</span>
          </div>
          <ProgressPips size="md" done={progress.done} total={progress.total} label={fmt(v.progress, { done: progress.done, total: progress.total })} />
        </Ticket>

        {items.length === 0 ? (
          <p className="py-6 text-center text-[14px] text-ink-2">{v.emptyItems}</p>
        ) : (
          <Ticket variant="sections">
            {items.map((item) => {
              const isDone = item.doneAt !== null;
              const doneBy = doneByOther(item, meId);
              const text = (
                <>
                  <CheckMark checked={isDone} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[15px] font-medium", isDone && "text-ink-3 line-through decoration-perf")}>{item.text}</span>
                    {doneBy && <span className="block text-[12px] text-ink-2">{doneBy}</span>}
                  </span>
                </>
              );

              return (
                <TicketSection key={item.id} className="p-0">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isDone}
                    onClick={() => handleToggle(item.id)}
                    className="flex min-h-12 w-full items-center gap-3 px-3.5 py-2 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    {text}
                  </button>
                </TicketSection>
              );
            })}
          </Ticket>
        )}

        {!isOwner && <p className="text-[13px] text-ink-2">{v.readOnlyHint}</p>}

        {/* В потоке страницы, а не липкой панелью: ничего не перекрывает пункты. Слева красное «Видалити», справа компактное «Надіслати». */}
        {isOwner && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <DeleteChecklistButton checklistId={detail.id} />
            <Button size="sm" onClick={() => setSendOpen(true)}>
              <Send className="size-4" strokeWidth={1.9} aria-hidden />
              {v.send}
            </Button>
          </div>
        )}
      </div>

      {isOwner && (
        <>
          <SendChecklistSheet
            open={sendOpen}
            onOpenChange={handleSendOpenChange}
            checklist={{
              id: detail.id,
              title: detail.title,
              siteName: detail.siteName,
              items: detail.items.map((item) => item.text),
              shareToken: detail.shareToken,
            }}
            colleagues={colleagues}
          />
        </>
      )}
    </div>
  );
}
