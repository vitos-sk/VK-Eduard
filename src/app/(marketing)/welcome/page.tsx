import { PhoneFrame } from "@/components/layout/PhoneFrame";
import { WelcomeScreen } from "@/components/welcome/WelcomeScreen";

/**
 * Стартовый экран `/welcome` — единственная страница вне `(app)`:
 * без таб-бара и без данных пользователя.
 *
 * Когда появится авторизация (этап 2), `proxy.ts` будет отправлять сюда
 * всех, кто не вошёл. Пока экран открывается по прямой ссылке.
 */
export default function WelcomePage() {
  return (
    <PhoneFrame>
      <div className="h-full overflow-y-auto">
        <WelcomeScreen />
      </div>
    </PhoneFrame>
  );
}
