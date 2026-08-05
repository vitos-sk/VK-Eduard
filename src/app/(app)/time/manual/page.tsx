import { ManualTimeScreen } from "@/components/time/ManualTimeScreen";
import type { TimeEntryKind } from "@/lib/types";

/** `?type=outside` из листа быстрых действий предвыбирает «Поза об'єктом». */
export default async function ManualTimePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { type } = await searchParams;
  const defaultKind: TimeEntryKind = type === "outside" ? "outside" : "on_site";

  return <ManualTimeScreen defaultKind={defaultKind} />;
}
