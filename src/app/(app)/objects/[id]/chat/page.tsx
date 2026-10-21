import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { requireProfile } from "@/modules/auth/session";
import { openSiteChat } from "@/modules/chats/queries";

/**
 * `/objects/[id]/chat`: открывает чат объекта (создаёт при первом обращении) и ведёт в него.
 * Ссылка сюда не предзагружается (`prefetch={false}`), чтобы чат создавался только по нажатию.
 */
export default async function SiteChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  await requireProfile();
  const chatId = await openSiteChat(await createClient(), id);

  // База не открыла чат: объекта нет или он из другой фирмы.
  if (!chatId) notFound();

  redirect(`/chats/${chatId}`);
}
