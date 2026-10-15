import { ChecklistForm } from "@/components/checklists/ChecklistForm";
import { getLocale, getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { defaultChecklistTitle } from "@/modules/checklists/title";
import { getActiveSites } from "@/modules/sites/queries";

export default async function NewChecklistPage() {
  await requireProfile();
  const t = await getT();
  const locale = await getLocale();
  const supabase = await createClient();
  const sites = await getActiveSites(supabase);

  // Название подставляется само («Чеклист · 15 жовтня»): вводить его не нужно, поменять можно в любой момент.
  return <ChecklistForm sites={sites} defaultTitle={defaultChecklistTitle(t.checklists.form.defaultTitle, new Date(), locale)} />;
}
