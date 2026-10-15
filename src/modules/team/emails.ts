import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Email активних співробітників компанії (`worker id → email`) для екрана
 * «Команда» (тільки boss). Email живе в `auth.users`, а не в `profiles`, тож
 * RLS-клієнт його не бачить — читаємо Admin API. Викликати лише після
 * перевірки ролі boss і з `companyId` самого боса.
 *
 * Збій по одному акаунту не валить екран: без email рядок просто лишається
 * без підпису.
 */
export async function getCompanyWorkerEmails(
  companyId: string,
): Promise<Record<string, string>> {
  const admin = createAdminClient();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id")
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (error) throw error;

  const entries = await Promise.all(
    (profiles ?? []).map(async ({ id }) => {
      const { data, error: userError } = await admin.auth.admin.getUserById(id);
      const email = userError ? null : data.user?.email;

      return email ? ([id, email] as const) : null;
    }),
  );

  return Object.fromEntries(entries.filter((entry) => entry !== null));
}
