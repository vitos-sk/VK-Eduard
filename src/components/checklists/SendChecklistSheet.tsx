"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Link as LinkIcon, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { WhatsAppIcon } from "@/components/shared/WhatsAppIcon";
import { SearchField } from "@/components/shared/SearchField";
import { useAvatarUrls } from "@/components/shared/useAvatarUrls";
import { initialsOf } from "@/components/shared/Thumb";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckMark } from "@/components/ui/checkbox";
import { Radio, RadioGroup } from "@/components/ui/radio";
import { ResponsiveSheet, SheetTitle } from "@/components/ui/responsive-sheet";
import { fmt, pluralize } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import type { Colleague } from "@/modules/chats/queries";
import { sendChecklist } from "@/modules/checklists/actions";
import { shareUrl } from "@/modules/checklists/token";
import { buildShareMessage, whatsAppUrl, type ShareFormat } from "@/modules/checklists/whatsapp";

/** Сколько колег показываем без строки поиска. */
const SEARCH_FROM = 8;

export interface SharedChecklist {
  id: string;
  title: string;
  siteName: string | null;
  items: string[];
  shareToken: string;
}

interface SendChecklistSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklist: SharedChecklist;
  colleagues: Colleague[];
}

/**
 * Лист «Надіслати чеклист»: сверху чат 1 на 1 с выбранными колегами (создаётся сам),
 * ниже WhatsApp — готовый текст со списком и ссылкой (второй шаг листа) либо только ссылка.
 */
export function SendChecklistSheet({ open, onOpenChange, checklist, colleagues }: SendChecklistSheetProps) {
  const t = useT();
  const locale = useLocale();
  const s = t.checklists.send;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<"main" | "whatsapp">("main");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState<ShareFormat>("text");

  const avatars = useAvatarUrls(colleagues.map((person) => ({ id: person.id, avatar_path: person.avatarPath })));
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return needle === "" ? colleagues : colleagues.filter((person) => person.name.toLowerCase().includes(needle));
  }, [colleagues, query]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);

    // Следующее открытие начинается с чистого листа.
    if (!next) {
      setStep("main");
      setSelected(new Set());
      setQuery("");
    }
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  }

  function handleSendToChat() {
    startTransition(async () => {
      const result = await sendChecklist(checklist.id, [...selected]);

      if (result.error) {
        toast(result.error);
        return;
      }

      const names = colleagues.filter((person) => selected.has(person.id)).map((person) => person.name);
      const singleChat = result.chats.length === 1 ? result.chats[0].chatId : null;

      toast(fmt(s.sent, { names: names.join(", ") }), {
        action: singleChat ? { label: s.openChat, onClick: () => router.push(`/chats/${singleChat}`) } : undefined,
      });
      handleOpenChange(false);
      router.refresh();
    });
  }

  function buildMessage(): string {
    return buildShareMessage(
      {
        title: checklist.title,
        siteName: checklist.siteName,
        items: checklist.items,
        countLabel: pluralize(checklist.items.length, locale, t.checklists.count),
        url: shareUrl(window.location.origin, checklist.shareToken),
        format,
      },
      s.message,
    );
  }

  function handleOpenWhatsApp() {
    const url = whatsAppUrl(buildMessage());

    // Если браузер не дал открыть новое окно, переходим в этом же: человек вернётся в приложение кнопкой «назад».
    if (!window.open(url, "_blank", "noopener,noreferrer")) window.location.href = url;
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl(window.location.origin, checklist.shareToken));
      toast(s.linkCopied);
    } catch {
      toast(s.error);
    }
  }

  // Предпросмотр строится только в браузере (нужен адрес сайта), поэтому не на сервере.
  const preview = open && step === "whatsapp" && typeof window !== "undefined" ? buildMessage() : "";

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={handleOpenChange}
      mobileClassName={cn(
        "mx-auto max-w-[560px] border-edge bg-ticket text-text",
        "pb-[calc(60px+env(safe-area-inset-bottom))]",
        "data-[vaul-drawer-direction=bottom]:max-h-[92dvh]",
      )}
      desktopClassName="border-edge bg-ticket"
    >
      {step === "main" ? (
        <>
          <div className="p-4 pb-2 text-center lg:text-left">
            <SheetTitle className="text-[20px] font-semibold text-text">{s.title}</SheetTitle>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-primary">
              <MessageCircle className="size-4" strokeWidth={1.9} aria-hidden />
              {s.inApp}
            </p>

            {colleagues.length >= SEARCH_FROM && (
              <SearchField className="mt-2" compact value={query} onChange={setQuery} placeholder={s.search} />
            )}

            {colleagues.length === 0 ? (
              <p className="py-3 text-[14px] text-ink-2">{s.noColleagues}</p>
            ) : (
              <ul className="mt-1">
                {visible.map((person) => {
                  const isOn = selected.has(person.id);

                  return (
                    <li key={person.id} className="not-first:border-t not-first:border-dashed not-first:border-perf">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isOn}
                        onClick={() => toggle(person.id)}
                        className="flex min-h-12 w-full items-center gap-3 rounded-ctl px-1 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring"
                      >
                        <Avatar initials={initialsOf(person.name)} src={avatars[person.id]} className="size-9" />
                        <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{person.name}</span>
                        {person.isBoss && <Badge>{t.chats.roleBoss}</Badge>}
                        <CheckMark checked={isOn} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-3 px-4 pt-2 pb-4">
            <Button block disabled={selected.size === 0} loading={isPending} onClick={handleSendToChat}>
              {selected.size === 0 ? s.toChat : fmt(s.toChatCount, { n: selected.size })}
            </Button>

            <div className="flex items-center gap-3 text-[12px] text-ink-3">
              <span className="h-px flex-1 border-t border-dashed border-perf" />
              {s.outside}
              <span className="h-px flex-1 border-t border-dashed border-perf" />
            </div>

            <Button variant="outline" block onClick={() => setStep("whatsapp")}>
              <WhatsAppIcon className="text-ok" />
              {s.whatsapp}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1 p-4 pb-2">
            <Button variant="ghost" size="icon-sm" className="-ml-1.5" onClick={() => setStep("main")} aria-label={t.common.back}>
              <ChevronLeft className="size-5" strokeWidth={1.9} aria-hidden />
            </Button>
            <SheetTitle className="text-[20px] font-semibold text-text">{s.whatsappTitle}</SheetTitle>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as ShareFormat)} aria-label={s.whatsappTitle}>
              {(
                [
                  ["text", s.formatText, s.formatTextHint],
                  ["link", s.formatLink, s.formatLinkHint],
                ] as const
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-start gap-3 rounded-ctl border border-edge bg-ticket px-3 py-2.5 has-data-checked:border-primary has-data-checked:bg-primary-tint"
                >
                  <Radio value={value} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium">{label}</span>
                    <span className="block text-[12px] text-ink-2">{hint}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>

            <p className="mt-3 mb-1 text-[12px] text-ink-2">{s.preview}</p>
            <pre className="max-h-48 overflow-y-auto rounded-ctl border border-edge bg-stub px-3 py-2 font-sans text-[13px] leading-[1.45] break-words whitespace-pre-wrap">
              {preview}
            </pre>
          </div>

          <div className="space-y-2 px-4 pt-2 pb-4">
            <Button block onClick={handleOpenWhatsApp}>
              <WhatsAppIcon />
              {s.openWhatsapp}
            </Button>
            <Button variant="outline" block onClick={handleCopyLink}>
              <LinkIcon className="size-[18px]" strokeWidth={1.9} aria-hidden />
              {s.copyLink}
            </Button>
            <p className="text-center text-[12px] text-ink-2">{s.whatsappHint}</p>
          </div>
        </>
      )}
    </ResponsiveSheet>
  );
}
