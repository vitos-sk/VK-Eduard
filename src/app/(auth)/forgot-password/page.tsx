import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { PhoneFrame } from "@/components/layout/PhoneFrame";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();

  return { title: t.auth.forgotTitle };
}

/** Запрос ссылки для нового пароля. Открыта без входа (`proxy.ts`: PUBLIC_PATHS). */
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <PhoneFrame>
      <div className="h-full overflow-y-auto">
        <ForgotPasswordForm linkInvalid={error === "link"} />
      </div>
    </PhoneFrame>
  );
}
