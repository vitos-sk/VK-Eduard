import { cn } from "@/lib/utils";

/**
 * Размеры миниатюры:
 * `sm` — строка-селектор объекта в форме, `md` — карточка объекта (88×72),
 * `wide` — карточка отчёта («широкое фото»).
 */
export type ThumbSize = "sm" | "md" | "wide";

const sizeStyles: Record<ThumbSize, string> = {
  sm: "size-[48px] rounded-[10px] text-[15px]",
  md: "h-[72px] w-[88px] rounded-[12px] text-[20px]",
  wide: "h-[84px] w-[104px] rounded-[12px] text-[22px]",
};

/** «Villa Project» → «VP», «Reimond» → «RE». Максимум две буквы. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return (words[0][0] + words[1][0]).toUpperCase();
}

interface ThumbProps {
  /** Название объекта — из него берутся инициалы. */
  name: string;
  /** Пара цветов градиента из мока объекта. */
  gradient: readonly [string, string];
  size?: ThumbSize;
  className?: string;
}

/**
 * Плейсхолдер фотографии объекта: градиентный прямоугольник с инициалами.
 * Реальных изображений в UI-фазе нет.
 */
export function Thumb({ name, gradient, size = "md", className }: ThumbProps) {
  return (
    <div
      aria-hidden
      style={{
        backgroundImage: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
      }}
      className={cn(
        "flex shrink-0 items-center justify-center",
        "font-extrabold tracking-[0.04em] text-white/70",
        sizeStyles[size],
        className,
      )}
    >
      {initialsOf(name)}
    </div>
  );
}
