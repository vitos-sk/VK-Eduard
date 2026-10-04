import { cn } from "@/lib/utils"

interface AvatarProps {
  /** Инициалы, если фото нет. */
  initials: string
  /** Подписанная ссылка на фото. */
  src?: string | null
  className?: string
}

/** Аватар-квадрат: фото сотрудника или инициалы на корешке. Размер задаётся классом (`size-8`). */
function Avatar({ initials, src, className }: AvatarProps) {
  return (
    <span
      aria-hidden
      data-slot="avatar"
      className={cn(
        "relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-md border border-edge bg-stub text-[12px] font-semibold text-text",
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage
        <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        initials
      )}
    </span>
  )
}

export { Avatar }
