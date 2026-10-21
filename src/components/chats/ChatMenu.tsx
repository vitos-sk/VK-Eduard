"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eraser, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/lib/i18n/client";
import { clearChat, deleteChat } from "@/modules/chats/actions";

interface ChatMenuProps {
  chatId: string;
  /** «Видалити чат» есть только у чата 1 на 1: чат объекта живёт, пока есть объект, его можно лишь очистить у себя. */
  canDelete: boolean;
  /** Чат очищен у этого человека: экран показывает пустую переписку. */
  onCleared: () => void;
}

type Action = "clear" | "delete";

/** Меню «⋮» в шапке чата: очистить у себя и (для чата 1 на 1) удалить у обоих. Оба действия — через окно подтверждения. */
export function ChatMenu({ chatId, canDelete, onCleared }: ChatMenuProps) {
  const t = useT();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState<Action | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Текст окна не пропадает на время его закрытия: последнее действие помним отдельно от «открыто ли окно».
  const [lastAction, setLastAction] = useState<Action>("clear");
  const texts = lastAction === "delete" ? t.chats.deleteChat : t.chats.clearChat;

  function ask(action: Action) {
    setMenuOpen(false);
    setLastAction(action);
    setConfirming(action);
  }

  async function handleConfirm() {
    if (!confirming) return;

    const action = confirming;
    setIsBusy(true);

    const run = action === "delete" ? deleteChat : clearChat;
    const result = await run(chatId).catch(() => ({ error: texts.error }));
    setIsBusy(false);

    if (result.error) {
      toast(result.error);
      return;
    }

    setConfirming(null);
    toast(texts.done);

    if (action === "delete") router.replace("/chats");
    else onCleared();
  }

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t.chats.menu.open} className="-mr-1.5 shrink-0 text-text-muted">
            <MoreVertical className="size-5" strokeWidth={1.9} aria-hidden />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-52 !bg-surface !text-text !ring-border">
          <Button variant="ghost" size="sm" block className="justify-start rounded-sm px-2" onClick={() => ask("clear")}>
            <Eraser className="size-[16px] text-text-muted" strokeWidth={1.9} aria-hidden />
            {t.chats.menu.clear}
          </Button>

          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              block
              className="justify-start rounded-sm px-2 text-danger-fg hover:bg-danger/10"
              onClick={() => ask("delete")}
            >
              <Trash2 className="size-[16px]" strokeWidth={1.9} aria-hidden />
              {t.chats.menu.delete}
            </Button>
          )}
        </PopoverContent>
      </Popover>

      <Modal open={confirming !== null} onOpenChange={(open) => !open && !isBusy && setConfirming(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{texts.title}</ModalTitle>
            <ModalDescription>{texts.body}</ModalDescription>
          </ModalHeader>

          <ModalFooter>
            <Button variant="outline" onClick={() => setConfirming(null)} disabled={isBusy}>
              {t.common.cancel}
            </Button>
            <Button variant={lastAction === "delete" ? "danger" : "primary"} onClick={() => void handleConfirm()} loading={isBusy}>
              {texts.confirm}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
