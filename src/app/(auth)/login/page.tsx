import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/LoginForm";
import { PhoneFrame } from "@/components/layout/PhoneFrame";
import { getT } from "@/lib/i18n/server";
import { safeNextPath } from "@/modules/auth/redirect";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();

  return { title: t.auth.title };
}

/**
 * Вход. Вне `(app)`: без таб-бара и без данных пользователя.
 * Вошедшего сюда не пускает `proxy.ts` — отправляет на главную.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <PhoneFrame>
      <div className="h-full overflow-y-auto">
        <LoginForm next={safeNextPath(next, "")} />
      </div>
    </PhoneFrame>
  );
}
