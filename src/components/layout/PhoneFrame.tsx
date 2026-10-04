import type { ReactNode } from "react";

interface PhoneFrameProps {
  children: ReactNode;
}

/**
 * Контейнер приложения.
 *
 * На телефоне — просто экран во всю ширину на весь вьюпорт (`fixed inset-0` — надёжнее `dvh` на iOS).
 * От 480px — колонка 430px по центру со скруглением и тонкой рамкой,
 * фон вокруг — токен `--bg-outer`, чуть темнее основного.
 *
 * Внутренние элементы позиционируются относительно этого контейнера
 * (`relative`), поэтому таб-бар «прилипает» к телефону, а не к окну браузера.
 */
export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-bg-outer">
      <div className="app-bg relative flex h-full w-full max-w-[430px] flex-col overflow-hidden phone:h-[calc(100%-3rem)] phone:rounded-[32px] phone:border phone:border-border">
        {children}
      </div>
    </div>
  );
}
