import { notFound } from "next/navigation";

import { ChecklistForm } from "@/components/checklists/ChecklistForm";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { requireProfile } from "@/modules/auth/session";
import { getChecklist } from "@/modules/checklists/queries";
import { getActiveSites } from "@/modules/sites/queries";

export default async function EditChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const profile = await requireProfile();
  const supabase = await createClient();
  const [detail, sites] = await Promise.all([getChecklist(supabase, id), getActiveSites(supabase)]);

  // Править можно только свой чеклист; присланную копию — нет.
  if (!detail || detail.ownerId !== profile.id || detail.isReceived) notFound();

  return (
    <ChecklistForm
      key={detail.id}
      sites={sites}
      defaultTitle={detail.title}
      initial={{ id: detail.id, title: detail.title, siteId: detail.siteId, items: detail.items.map((item) => ({ id: item.id, text: item.text })) }}
    />
  );
}
