import { ObjectForm } from "@/components/objects/ObjectForm";
import { requireProfile } from "@/modules/auth/session";

/** Створення об'єкта — доступне кожному співробітнику компанії (RLS `sites_insert`). */
export default async function NewObjectPage() {
  const profile = await requireProfile();

  return <ObjectForm companyId={profile.company_id} />;
}
