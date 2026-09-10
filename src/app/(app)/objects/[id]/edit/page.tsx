import { notFound, redirect } from "next/navigation";

import { ObjectForm } from "@/components/objects/ObjectForm";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getSiteById } from "@/modules/sites/queries";

/** Редагування об'єкта — тільки boss (RLS `sites_update` все одно б відхилила). */
export default async function EditObjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();

  if (profile.role !== "boss") {
    redirect(`/objects/${id}`);
  }

  const supabase = await createClient();
  const site = await getSiteById(supabase, id);

  if (!site) {
    notFound();
  }

  return <ObjectForm site={site} />;
}
