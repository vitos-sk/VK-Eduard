import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { PhoneFrame } from "@/components/layout/PhoneFrame";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();

  return { title: t.auth.resetTitle };
}

/**
 * Ввод нового пароля. Сюда приводит `/auth/callback` по ссылке из письма — к этому моменту сессия уже есть.
 * Без сессии (страницу открыли напрямую) отправляем запросить ссылку заново.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password?error=link");
  }

  return (
    <PhoneFrame>
      <div className="h-full overflow-y-auto">
        <ResetPasswordForm />
      </div>
    </PhoneFrame>
  );
}
