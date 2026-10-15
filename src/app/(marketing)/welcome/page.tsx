import { PhoneFrame } from "@/components/layout/PhoneFrame";
import { WelcomeScreen } from "@/components/welcome/WelcomeScreen";
import { safeNextPath } from "@/modules/auth/redirect";

/**
 * Стартовый экран `/welcome` — единственная страница вне `(app)`:
 * без таб-бара и без данных пользователя.
 *
 * `proxy.ts` отправляет сюда всех, кто не вошёл. Если человек шёл по ссылке (например, на чеклист из WhatsApp),
 * адрес лежит в `?next=` и передаётся дальше на вход, чтобы после входа вернуть его туда.
 */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <PhoneFrame>
      <div className="h-full overflow-y-auto">
        <WelcomeScreen next={safeNextPath(next, "")} />
      </div>
    </PhoneFrame>
  );
}
