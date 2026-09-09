import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Знак «K» из фирменного логотипа: сплошная белая форма — ножка, верхний луч
 * и срезанный по диагонали низ — плюс жёлтая пирамидка в вырезе.
 *
 * Координаты сняты с оригинального файла логотипа и нормализованы
 * в квадрат 100×100, поэтому цифры «некруглые» — подгонять их «на глаз»
 * не нужно, знак перестанет совпадать с печатной версией.
 */
export function LogoMark({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden
      focusable="false"
    >
      {/* Ножка, верхний луч и диагональный срез — одной фигурой */}
      <path
        d="M0 0h32.6v36.9L68.4 0H100v17.1L24.6 98.4H0Z"
        fill="currentColor"
      />
      {/* Пирамидка в вырезе — единственный жёлтый элемент знака */}
      <path d="M71.1 69.5 98.4 98.4H46Z" fill="var(--brand)" />
    </svg>
  );
}

/**
 * Полный логотип: знак + «work.» с жёлтой точкой.
 *
 * `size` задаёт кегль надписи, знак подстраивается под него.
 */
export function Logo({
  className,
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div className={cn("flex items-center gap-2 text-text", className)}>
      <LogoMark size={size * 1.7} />
      <span
        className="font-extrabold tracking-tight"
        style={{ fontSize: size }}
      >
        {t.common.appWordmark}
        <span className="text-brand">.</span>
      </span>
    </div>
  );
}
