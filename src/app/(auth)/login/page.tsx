import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/LoginForm";
import { PhoneFrame } from "@/components/layout/PhoneFrame";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();

  return { title: t.auth.title };
}

/**
 * Вход. Вне `(app)`: без таб-бара и без данных пользователя.
 * Вошедшего сюда не пускает `proxy.ts` — отправляет на главную.
 */
export default function LoginPage() {
  return (
    <PhoneFrame>
      <div className="h-full overflow-y-auto">
        <LoginForm />
      </div>
    </PhoneFrame>
  );
}
