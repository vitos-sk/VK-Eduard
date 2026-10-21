"use client";

import { usePathname } from "next/navigation";

import { ChatBell } from "@/components/chats/ChatBell";
import { AvatarLink } from "@/components/layout/AvatarLink";
import { hasTopBarCorner } from "@/components/layout/topBar";

/**
 * Значок чатов и аватар в правом верхнем углу телефона. Стоит в оболочке, а не в шапке страницы, поэтому
 * при переходе между главными экранами не пересоздаётся (как нижняя панель) и не мигает.
 *
 * Нулевой высоты и `sticky top-0`: встаёт ровно туда, где начинается шапка страницы (под баннером «Показано
 * збережене», если он есть), и прилипает вместе с ней при прокрутке. Кнопки лежат поверх шапки (`z-30`);
 * шапка оставляет им место справа (`TOP_BAR_CORNER_PAD`).
 */
export function TopBarCorner({ initials }: { initials: string }) {
  const pathname = usePathname();

  if (!hasTopBarCorner(pathname)) return null;

  return (
    <div className="sticky top-0 z-30 h-0">
      <div className="absolute top-0 right-0 flex items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <ChatBell />
        <AvatarLink initials={initials} />
      </div>
    </div>
  );
}
