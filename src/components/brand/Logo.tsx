import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Знак «K»: белая ножка с верхним лучом и жёлтый нижний луч-треугольник.
 * Рисуется в квадрате 100×100 и масштабируется через `size`.
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
      {/* Ножка и верхний луч — одной фигурой, цвет текста */}
      <path d="M4 6h22v88H4z" fill="currentColor" />
      <path d="M30 50 74 6h24L50 54z" fill="currentColor" />
      {/* Нижний луч — жёлтый треугольник, главный акцент знака */}
      <path d="M46 58 96 94H58L34 74z" fill="var(--brand)" />
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
      <LogoMark size={size * 1.9} />
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
