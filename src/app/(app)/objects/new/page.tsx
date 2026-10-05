import { ObjectForm } from "@/components/objects/ObjectForm";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getWorkCategories } from "@/modules/reports/queries";

/** Створення об'єкта — доступне кожному співробітнику компанії (RLS `sites_insert`). */
export default async function NewObjectPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const categories = await getWorkCategories(supabase, profile.company_id);

  return <ObjectForm companyId={profile.company_id} categories={categories} />;
}
