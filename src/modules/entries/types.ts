import type { Tables } from "@/lib/supabase/types.gen";

/** Строка `work_entries` как она лежит в базе — включая generated-колонки. */
export type WorkEntry = Tables<"work_entries">;
