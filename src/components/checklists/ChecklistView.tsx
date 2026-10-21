"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SendChecklistSheet } from "@/components/checklists/SendChecklistSheet";
import { BackHeader } from "@/components/layout/ScreenHeader";
import { StickyActionBar } from "@/components/shared/FormParts";
import { Button } from "@/components/ui/button";
import { CheckMark } from "@/components/ui/checkbox";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProgressPips } from "@/components/ui/progress-pips";
import { Ticket, TicketSection } from "@/components/ui/ticket";
import { fmt } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import type { Colleague } from "@/modules/chats/queries";
import { deleteChecklist, setItemDone } from "@/modules/checklists/actions";
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

/** `/checklists/[id]`: пункты с галочками и прогрессом, меню «⋮», кнопка «Надіслати». */
export function ChecklistView({ detail, meId, isOwner, colleagues, openSend }: ChecklistViewProps) {
  const t = useT();
  const v = t.checklists.view;
  const router = useRouter();
  const [, startDeleteTransition] = useTransition();

  const [items, setItems] = useState(detail.items);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  function handleDelete() {
    setIsDeleting(true);

    startDeleteTransition(async () => {
      // Успех: сервер сам переводит на «Чеклисти». Сюда управление возвращается только при ошибке.
      const result = await deleteChecklist(detail.id);

      setIsDeleting(false);
      if (result?.error) toast(result.error);
    });
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
          isOwner ? (
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={v.menu} className="text-text-muted">
                  <MoreVertical className="size-[18px]" strokeWidth={1.9} aria-hidden />
                </Button>
              </PopoverTrigger>

              <PopoverContent align="end" className="w-52 !bg-surface !text-text !ring-border">
                {!detail.isReceived && (
                  <Button asChild variant="ghost" size="sm" block className="justify-start rounded-sm px-2">
                    <Link href={`/checklists/${detail.id}/edit`} onClick={() => setMenuOpen(false)}>
                      <Pencil className="size-[16px] text-text-muted" strokeWidth={1.9} aria-hidden />
                      {v.edit}
                    </Link>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  block
                  className="justify-start rounded-sm px-2 text-danger-fg hover:bg-danger/10"
                  onClick={() => {
                    setMenuOpen(false);
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="size-[16px]" strokeWidth={1.9} aria-hidden />
                  {v.delete}
                </Button>
              </PopoverContent>
            </Popover>
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
      </div>

      {isOwner && (
        <StickyActionBar>
          <Button block onClick={() => setSendOpen(true)}>
            <Send className="size-[18px]" strokeWidth={1.9} aria-hidden />
            {v.send}
          </Button>
        </StickyActionBar>
      )}

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

          <Modal open={deleteOpen} onOpenChange={setDeleteOpen}>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>{v.deleteTitle}</ModalTitle>
                <ModalDescription>{v.deleteBody}</ModalDescription>
              </ModalHeader>

              <ModalFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  {t.common.cancel}
                </Button>
                <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
                  {v.deleteConfirm}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </>
      )}
    </div>
  );
}
