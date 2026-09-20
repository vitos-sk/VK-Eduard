import { cn } from "@/lib/utils";

/**
 * Размеры миниатюры:
 * `sm` — строка-селектор объекта в форме, `md` — карточка объекта (88×72),
 * `wide` — карточка отчёта («широкое фото»).
 */
export type ThumbSize = "sm" | "md" | "wide";

const sizeStyles: Record<ThumbSize, string> = {
  sm: "size-[48px] rounded-md text-[15px]",
  md: "h-[72px] w-[88px] rounded-ctl text-[20px]",
  wide: "h-[84px] w-[104px] rounded-ctl text-[22px]",
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
  /** Подписанная ссылка на фото объекта — рисуется вместо градиента, если есть. */
  photoUrl?: string | null;
  size?: ThumbSize;
  className?: string;
}

/**
 * Миниатюра объекта: реальное фото (`photoUrl`), если оно загружено,
 * иначе — плейсхолдер из градиента с инициалами.
 */
export function Thumb({ name, gradient, photoUrl, size = "md", className }: ThumbProps) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage
      <img
        src={photoUrl}
        alt=""
        aria-hidden
        className={cn("shrink-0 object-cover", sizeStyles[size], className)}
      />
    );
  }

  return (
    <div
      aria-hidden
      style={{
        backgroundImage: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
      }}
      className={cn(
        "flex shrink-0 items-center justify-center",
        "font-extrabold tracking-[0.04em] text-on-scrim-muted",
        sizeStyles[size],
        className,
      )}
    >
      {initialsOf(name)}
    </div>
  );
}
