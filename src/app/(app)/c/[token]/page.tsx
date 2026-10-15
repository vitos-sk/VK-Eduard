import { redirect } from "next/navigation";

import { SharedChecklistLanding } from "@/components/checklists/SharedChecklistLanding";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getChecklistByToken } from "@/modules/checklists/queries";
import { isShareToken } from "@/modules/checklists/token";

/** Ссылка из WhatsApp. Неавторизованного сюда не пускает `proxy.ts`: сначала вход, затем возврат на эту страницу. */
export default async function SharedChecklistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const profile = await requireProfile();

  const preview = isShareToken(token) ? await getChecklistByToken(await createClient(), token) : null;

  // Свою же ссылку человек открывает как обычный свой чеклист.
  if (preview && preview.ownerId === profile.id) redirect(`/checklists/${preview.id}`);

  return <SharedChecklistLanding token={token} preview={preview} />;
}
