import { ImageOff } from "lucide-react"

import { SafeImg } from "@/components/shared/SafeImg"
import { cn } from "@/lib/utils"

interface CardPhotoProps {
  /** Подписанная ссылка на фото; `null` — рамка-заглушка с иконкой «нет изображения». */
  src?: string | null
  className?: string
}

/**
 * Горизонтальное фото на правом краю талона, вплотную к рамке (без полей).
 * Подрезается автоматически (`object-cover`). Нет фото (или оно не загрузилось) — та же рамка с линейной иконкой.
 * Слева пунктир, как перфорация корешка. Родитель-талон должен быть `overflow-hidden`.
 */
function CardPhoto({ src, className }: CardPhotoProps) {
  const placeholder = (
    <span className="absolute inset-0 grid place-items-center text-ink-3">
      <ImageOff className="size-6" strokeWidth={1.9} />
    </span>
  )

  return (
    <div
      aria-hidden
      data-slot="card-photo"
      className={cn(
        "relative w-24 shrink-0 self-stretch overflow-hidden border-l border-dashed border-perf bg-stub",
        className
      )}
    >
      {src ? (
        <SafeImg src={src} loading="lazy" className="absolute inset-0 size-full object-cover" fallback={placeholder} />
      ) : (
        placeholder
      )}
    </div>
  )
}

export { CardPhoto }
