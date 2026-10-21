"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { useT } from "@/lib/i18n/client"
import { useOnline } from "@/lib/offline/hooks"

type NetworkButtonProps = React.ComponentProps<typeof Button> & {
  /** Подпись «Потрібен інтернет» под кнопкой, пока нет связи. В тесных местах (иконка в строке) — `false`. */
  hint?: boolean
}

/**
 * Кнопка для действия, которое без интернета невозможно: отправить отчёт, загрузить фото, сохранить правку.
 * Пока связи нет — неактивна (человек видит это ДО нажатия, а не ошибкой после), под ней короткая подсказка.
 * Действия, которые работают офлайн (запись времени через очередь), остаются обычной `Button`.
 */
function NetworkButton({ hint = true, disabled, ...props }: NetworkButtonProps) {
  const t = useT()
  const online = useOnline()

  return (
    <>
      <Button disabled={disabled || !online} {...props} />
      {!online && hint && (
        <p role="status" className="mt-1.5 text-center text-[12px] text-text-muted">
          {t.offline.needsNetwork}
        </p>
      )}
    </>
  )
}

export { NetworkButton }
