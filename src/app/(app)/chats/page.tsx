import { ChatsScreen } from "@/components/chats/ChatsScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getMyChats } from "@/modules/chats/queries";

export default async function ChatsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const chats = await getMyChats(supabase);

  return <ChatsScreen initial={chats} meId={profile.id} />;
}
