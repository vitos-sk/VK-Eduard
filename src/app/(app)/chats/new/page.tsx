import { NewChatScreen } from "@/components/chats/NewChatScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getColleagues, getMyChats } from "@/modules/chats/queries";

export default async function NewChatPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [colleagues, chats] = await Promise.all([getColleagues(supabase, profile.id), getMyChats(supabase)]);

  return <NewChatScreen colleagues={colleagues} withChat={chats.map((chat) => chat.otherId)} />;
}
