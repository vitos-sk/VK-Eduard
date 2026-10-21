"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";

interface SafeImgProps extends Omit<ComponentProps<"img">, "src" | "alt"> {
  src: string;
  /** Что показать, если картинка не загрузилась (нет сети, ссылка протухла): сцена, иконка, инициалы. */
  fallback: ReactNode;
  alt?: string;
}

/**
 * Картинка с запасным видом. Без сети (или с протухшей подписанной ссылкой) браузер рисует
 * битый значок; вместо него показываем `fallback`.
 *
 * Если страница открыта из сохранённой копии без сети, картинка падает ещё ДО гидрации: React не успел
 * повесить `onError`, и событие потеряно. Поэтому после монтирования проверяем сами: `complete` при нулевой
 * ширине означает «загрузка закончилась ошибкой».
 */
export function SafeImg({ src, fallback, alt = "", ...props }: SafeImgProps) {
  // Помним, для какой ссылки случилась ошибка: новая ссылка сама снимает заглушку, сброс в эффекте не нужен.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = ref.current;

    if (image && image.complete && image.naturalWidth === 0) setFailedSrc(src);
  }, [src]);

  if (failedSrc === src) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage
    <img ref={ref} src={src} alt={alt} onError={() => setFailedSrc(src)} {...props} />
  );
}
