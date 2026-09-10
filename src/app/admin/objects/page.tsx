import { AdminObjectsScreen } from "@/components/admin/AdminObjectsScreen";
import { createClient } from "@/lib/supabase/server";
import { getAllSites } from "@/modules/sites/queries";

export default async function AdminObjectsPage() {
  const supabase = await createClient();
  const sites = await getAllSites(supabase);

  return <AdminObjectsScreen sites={sites} />;
}
