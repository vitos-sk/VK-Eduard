import { cn } from "@/lib/utils";
import type { SiteScene } from "@/lib/siteScene";

/**
 * Размеры миниатюры:
 * `sm` — строка-селектор объекта в форме, `md` — карточка объекта (88×72),
 * `wide` — карточка отчёта («широкое фото»), `cover` — шапка экрана объекта.
 */
export type ThumbSize = "sm" | "md" | "wide" | "cover";

const sizeStyles: Record<ThumbSize, string> = {
  sm: "size-[44px] rounded-md",
  md: "h-[72px] w-[88px] rounded-md",
  wide: "h-[84px] w-[104px] rounded-md",
  cover: "h-40 w-full rounded-card",
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
  /** Сцена-заглушка, пока нет `photoUrl`. */
  scene: SiteScene;
  /** Подписанная ссылка на фото объекта — рисуется вместо сцены, если есть. */
  photoUrl?: string | null;
  size?: ThumbSize;
  className?: string;
}

const fill = {
  bg: "var(--scene-bg)",
  mid: "var(--scene-mid)",
  dark: "var(--scene-dark)",
  ground: "var(--scene-ground)",
  sun: "var(--scene-sun)",
};

/** Линейные сцены на токенах палитры: цвета не хардкодятся. */
function Scene({ scene }: { scene: SiteScene }) {
  return (
    <svg
      viewBox="0 0 88 88"
      preserveAspectRatio="xMidYMid slice"
      className="size-full"
      aria-hidden
    >
      <rect width="88" height="88" style={{ fill: fill.bg }} />
      {scene === "roof" && (
        <>
          <circle cx="66" cy="20" r="6" style={{ fill: fill.sun }} />
          <path d="M8 56 44 26 80 56Z" style={{ fill: fill.mid }} />
          <path d="M44 26 80 56H44Z" style={{ fill: fill.dark }} />
          <path
            d="M16 50h56M22 44h44M30 38h28"
            style={{ stroke: fill.bg, strokeWidth: 1.4 }}
          />
          <rect y="56" width="88" height="32" style={{ fill: fill.ground }} />
        </>
      )}
      {scene === "gutter" && (
        <>
          <path d="M0 30h88v8H0z" style={{ fill: fill.mid }} />
          <path d="M0 38h88v4H0z" style={{ fill: fill.dark }} />
          <path d="M60 42h8v40h-8z" style={{ fill: fill.mid }} />
          <path d="M16 46h36v4H16z" style={{ fill: fill.ground }} />
        </>
      )}
      {scene === "facade" && (
        <>
          <rect x="10" y="14" width="68" height="70" style={{ fill: fill.ground }} />
          <g style={{ fill: fill.bg }}>
            <rect x="18" y="24" width="12" height="14" />
            <rect x="38" y="24" width="12" height="14" />
            <rect x="58" y="24" width="12" height="14" />
            <rect x="18" y="50" width="12" height="14" />
            <rect x="38" y="50" width="12" height="14" />
            <rect x="58" y="50" width="12" height="14" />
          </g>
        </>
      )}
    </svg>
  );
}

/**
 * Миниатюра объекта: реальное фото (`photoUrl`), если оно загружено,
 * иначе — SVG-сцена. Градиентных квадратов нет.
 */
export function Thumb({ scene, photoUrl, size = "md", className }: ThumbProps) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage
      <img
        src={photoUrl}
        alt=""
        aria-hidden
        className={cn("shrink-0 border border-edge object-cover", sizeStyles[size], className)}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={cn("shrink-0 overflow-hidden border border-edge", sizeStyles[size], className)}
    >
      <Scene scene={scene} />
    </div>
  );
}
