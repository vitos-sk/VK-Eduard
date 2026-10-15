"use server";

import { revalidatePath } from "next/cache";

import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/modules/auth/session";
import { notifyUser } from "@/modules/notifications/notify";

import { normalizeMessage } from "./rules";
import { chatPushText, chatUrl } from "./texts";

/** Код Postgres «нарушение уникальности»: сообщение с таким `client_id` уже есть (повторная отправка). */
const UNIQUE_VIOLATION = "23505";

export type StartChatState = { error: string; chatId: null } | { error: null; chatId: string };

/** Открывает чат 1 на 1 с коллегой (создаёт, если ещё нет). */
export async function startChat(otherId: string): Promise<StartChatState> {
  const t = await getT();
  const profile = await getProfile();
  if (!profile) return { error: t.auth.noProfile, chatId: null };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_chat", { p_other: otherId });

  if (error || !data) return { error: t.chats.startError, chatId: null };

  revalidatePath("/chats");

  return { error: null, chatId: data };
}

export interface SendMessageInput {
  chatId: string;
  text: string;
  /** Один на сообщение: форма создаёт его заранее и шлёт при каждой попытке — повтор не плодит дубли. */
  clientId: string;
}

export type SendMessageState = { error: string | null };

/** Пишет сообщение в чат и отправляет собеседнику push. */
export async function sendChatMessage(input: SendMessageInput): Promise<SendMessageState> {
  const t = await getT();
  const profile = await getProfile();
  if (!profile) return { error: t.auth.noProfile };

  const text = normalizeMessage(input.text);
  if (text === null) return { error: t.chats.sendError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_messages")
    .insert({ client_id: input.clientId, chat_id: input.chatId, sender_id: profile.id, kind: "text", body: text });

  // Это же сообщение уже сохранено прошлой попыткой: считаем отправленным, но второй push не шлём.
  if (error?.code === UNIQUE_VIOLATION) return { error: null };
  if (error) return { error: t.chats.sendError };

  const { data: chat } = await supabase.from("chats").select("user_a, user_b").eq("id", input.chatId).maybeSingle();

  if (chat) {
    const otherId = chat.user_a === profile.id ? chat.user_b : chat.user_a;

    await notifyUser(otherId, "chatMessages", (locale) => ({
      ...chatPushText("message", locale, { name: profile.full_name, text }),
      url: chatUrl(input.chatId),
      tag: `chat-${input.chatId}`,
    }));
  }

  return { error: null };
}
