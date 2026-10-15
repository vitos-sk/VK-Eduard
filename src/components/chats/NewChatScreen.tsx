"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { SearchField } from "@/components/shared/SearchField";
import { initialsOf } from "@/components/shared/Thumb";
import { useAvatarUrls } from "@/components/shared/useAvatarUrls";
import { Avatar } from "@/components/ui/avatar";
import { Ticket } from "@/components/ui/ticket";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { startChat } from "@/modules/chats/actions";
import type { Colleague } from "@/modules/chats/queries";

/** `/chats/new`: выбор коллеги; если чат с ним уже есть, откроется он. */
export function NewChatScreen({ colleagues, withChat }: { colleagues: Colleague[]; withChat: string[] }) {
  const t = useT();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const existing = useMemo(() => new Set(withChat), [withChat]);

  const avatars = useAvatarUrls(colleagues.map((person) => ({ id: person.id, avatar_path: person.avatarPath })));
  const needle = query.trim().toLowerCase();
  const visible = needle === "" ? colleagues : colleagues.filter((person) => person.name.toLowerCase().includes(needle));

  function open(id: string) {
    setOpeningId(id);

    startTransition(async () => {
      const result = await startChat(id);

      if (result.error) {
        setOpeningId(null);
        toast(result.error);
        return;
      }

      router.push(`/chats/${result.chatId}`);
    });
  }

  return (
    <div className="pb-6 lg:mx-auto lg:max-w-[640px]">
      <BackHeader title={t.chats.newTitle} href="/chats" />

      <div className="px-4 lg:px-0">
        <SearchField compact value={query} onChange={setQuery} placeholder={t.chats.findColleague} />

        <p className="mt-4 mb-2 text-[13px] font-medium text-ink-2">{t.chats.colleagues}</p>

        <div className="flex flex-col gap-2">
          {visible.map((person) => (
            <Ticket key={person.id} asChild variant="flat" interactive className={cn("flex items-center gap-3", openingId === person.id && "opacity-60")}>
              <button type="button" disabled={openingId !== null} onClick={() => open(person.id)} className="w-full text-left">
                <Avatar initials={initialsOf(person.name)} src={avatars[person.id]} className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{person.name}</span>
                  <span className="block text-[12px] text-ink-2">
                    {person.isBoss ? t.chats.roleBoss : t.chats.roleWorker}
                    {existing.has(person.id) ? ` · ${t.chats.hasChat}` : ""}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-ink-3" strokeWidth={1.9} aria-hidden />
              </button>
            </Ticket>
          ))}
        </div>
      </div>
    </div>
  );
}
