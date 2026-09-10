import { redirect } from "next/navigation";

import { ObjectForm } from "@/components/objects/ObjectForm";
import { requireProfile } from "@/modules/auth/session";

/** Створення об'єкта — тільки boss (RLS `sites_insert` все одно б відхилила). */
export default async function NewObjectPage() {
  const profile = await requireProfile();

  if (profile.role !== "boss") {
    redirect("/objects");
  }

  return <ObjectForm />;
}
