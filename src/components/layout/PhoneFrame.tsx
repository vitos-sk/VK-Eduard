import type { ReactNode } from "react";

interface PhoneFrameProps {
  children: ReactNode;
}

/**
 * Контейнер приложения.
 *
 * На телефоне — просто экран во всю ширину высотой `100dvh`.
 * От 480px — колонка 430px по центру со скруглением и тонкой рамкой,
 * фон вокруг чуть темнее основного.
 *
 * Внутренние элементы позиционируются относительно этого контейнера
 * (`relative`), поэтому таб-бар «прилипает» к телефону, а не к окну браузера.
 */
export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="flex h-dvh w-full items-center justify-center overflow-hidden bg-[#050506]">
      <div className="relative h-full w-full max-w-[430px] overflow-hidden bg-bg phone:h-[calc(100dvh-3rem)] phone:rounded-[32px] phone:border phone:border-border">
        {children}
      </div>
    </div>
  );
}
