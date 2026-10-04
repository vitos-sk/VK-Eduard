import type { ReactNode } from "react";

interface PhoneFrameProps {
  children: ReactNode;
}

/**
 * Контейнер приложения.
 *
 * На телефоне — экран во всю ширину на весь вьюпорт (`fixed inset-0` — надёжнее `dvh` на iOS).
 * На планшете (от 480 px) — та же телефонная раскладка колонкой по центру, не шире 560 px,
 * без рамки устройства, фон `paper`.
 *
 * Внутренние элементы позиционируются относительно этого контейнера
 * (`relative`), поэтому таб-бар «прилипает» к колонке, а не к окну браузера.
 */
export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-paper">
      <div className="app-bg relative flex h-full w-full max-w-[560px] flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
