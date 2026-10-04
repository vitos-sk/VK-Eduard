import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Поле без рамки: только нижняя линия 1 px. Фокус — линия 2 px зелёная,
 * ошибка — линия 2 px красная и текст ошибки 13 px под полем,
 * неактивное — линия цвета перфорации. 16 px на телефоне (иначе iOS зумит).
 */
const underlineClasses =
  "w-full min-w-0 rounded-none border-0 border-b border-ink-2 bg-transparent px-0 pt-2 pb-1.5 text-[16px] font-medium text-text transition-colors outline-none placeholder:text-ink-3 focus-visible:border-b-2 focus-visible:border-primary focus-visible:pb-[5px] focus-visible:outline-none aria-invalid:border-b-2 aria-invalid:border-err aria-invalid:pb-[5px] disabled:cursor-not-allowed disabled:border-perf disabled:text-ink-3"

type UnderlineFieldProps = React.ComponentProps<"input"> & {
  /** Подпись над полем (12 px, вторичный текст). */
  label?: React.ReactNode
  /** Текст ошибки; делает поле `aria-invalid`. */
  error?: React.ReactNode
}

function UnderlineField({
  className,
  label,
  error,
  id,
  ...props
}: UnderlineFieldProps) {
  const generatedId = React.useId()
  const fieldId = id ?? generatedId
  const errorId = `${fieldId}-error`

  return (
    <div data-slot="underline-field" className="flex flex-col">
      {label && (
        <label htmlFor={fieldId} className="text-[12px] text-ink-2">
          {label}
        </label>
      )}
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(underlineClasses, "min-h-10", className)}
        {...props}
      />
      {error && (
        <span id={errorId} aria-live="polite" className="mt-1 text-[13px] text-err">
          {error}
        </span>
      )}
    </div>
  )
}

type UnderlineTextareaProps = React.ComponentProps<"textarea"> & {
  label?: React.ReactNode
  error?: React.ReactNode
}

function UnderlineTextarea({
  className,
  label,
  error,
  id,
  ...props
}: UnderlineTextareaProps) {
  const generatedId = React.useId()
  const fieldId = id ?? generatedId
  const errorId = `${fieldId}-error`

  return (
    <div data-slot="underline-textarea" className="flex flex-col">
      {label && (
        <label htmlFor={fieldId} className="text-[12px] text-ink-2">
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(underlineClasses, "min-h-10 resize-none leading-[1.45]", className)}
        {...props}
      />
      {error && (
        <span id={errorId} aria-live="polite" className="mt-1 text-[13px] text-err">
          {error}
        </span>
      )}
    </div>
  )
}

export { UnderlineField, UnderlineTextarea }
