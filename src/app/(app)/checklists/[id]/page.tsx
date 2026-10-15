import { notFound } from "next/navigation";

import { ChecklistView } from "@/components/checklists/ChecklistView";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { requireProfile } from "@/modules/auth/session";
import { getColleagues } from "@/modules/chats/queries";
import { getChecklist } from "@/modules/checklists/queries";

export default async function ChecklistPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ send?: string }>;
}) {
  const { id } = await params;
  const { send } = await searchParams;
  if (!isUuid(id)) notFound();

  const profile = await requireProfile();
  const supabase = await createClient();
  const detail = await getChecklist(supabase, id);

  // RLS прячет чужие чеклисты как несуществующие.
  if (!detail) notFound();

  const isOwner = detail.ownerId === profile.id;
  const colleagues = isOwner ? await getColleagues(supabase, profile.id) : [];

  return <ChecklistView key={detail.id} detail={detail} isOwner={isOwner} colleagues={colleagues} openSend={isOwner && send === "1"} />;
}
