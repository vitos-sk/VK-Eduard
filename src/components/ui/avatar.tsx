import type { ReactNode } from "react"

import { SafeImg } from "@/components/shared/SafeImg"
import { cn } from "@/lib/utils"

interface AvatarProps {
  /** Инициалы, если фото нет. */
  initials?: string
  /** Иконка вместо инициалов: «все сотрудники», «объект» в списках выбора. */
  icon?: ReactNode
  /** Подписанная ссылка на фото; не загрузилось (нет сети) — показываем инициалы или иконку. */
  src?: string | null
  className?: string
}

/** Аватар-квадрат: фото сотрудника, инициалы или иконка на корешке. Размер задаётся классом (`size-8`). */
function Avatar({ initials, icon, src, className }: AvatarProps) {
  return (
    <span
      aria-hidden
      data-slot="avatar"
      className={cn(
        "relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-md border border-edge bg-stub text-[12px] font-semibold text-text",
        icon && "text-ink-2 [&_svg]:size-4",
        className
      )}
    >
      {src ? (
        <SafeImg src={src} className="absolute inset-0 size-full object-cover" fallback={icon ?? initials} />
      ) : (
        (icon ?? initials)
      )}
    </span>
  )
}

export { Avatar }
