import { notFound } from "next/navigation";

import { ChatThread } from "@/components/chats/ChatThread";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { requireProfile } from "@/modules/auth/session";
import { getChat, getChatMessages } from "@/modules/chats/queries";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const profile = await requireProfile();
  const supabase = await createClient();
  const chat = await getChat(supabase, id, profile.id);

  // RLS прячет чужие чаты как несуществующие.
  if (!chat) notFound();

  const messages = await getChatMessages(supabase, chat.id);

  return <ChatThread key={chat.id} chat={chat} meId={profile.id} initialMessages={messages} />;
}
