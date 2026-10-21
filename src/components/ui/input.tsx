import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** 16px и больше — иначе iOS зумит страницу при фокусе в поле. */
const fieldVariants = cva(
  "w-full min-w-0 rounded-ctl border border-border-strong bg-field text-[16px] font-medium text-text transition-colors outline-none placeholder:text-text-dim hover:border-text-dim focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring disabled:cursor-not-allowed disabled:border-perf disabled:bg-surface-2 disabled:text-text-dim aria-invalid:border-danger-fg aria-invalid:outline-2 aria-invalid:outline-offset-0 aria-invalid:outline-danger-fg",
  {
    variants: {
      size: {
        sm: "h-ctl-md px-3",
        md: "h-field px-4",
        lg: "h-ctl-xl px-4",
      },
    },
    defaultVariants: { size: "md" },
  }
)

type InputProps = Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof fieldVariants>

function Input({ className, size, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(fieldVariants({ size }), className)}
      {...props}
    />
  )
}

/**
 * `composer` — поле ввода чата: одна строка высотой с кнопки рядом (44 px на телефоне, 40 на ПК), растёт по тексту.
 * Строка целых 24 px и отступы 9 / 7 px подобраны так, чтобы строка с рамкой 2 px ровно помещалась в эту высоту:
 * иначе текст не влезает на пару пикселей и внутри поля появляется полоса прокрутки (на телефоне — серое пятно справа).
 * Полоса скрыта и когда текст дорос до максимальной высоты: поле всё равно прокручивается.
 */
const textareaVariants = cva("", {
  variants: {
    size: {
      default: "min-h-24 resize-y px-4 py-3 leading-[1.45]",
      composer: "min-h-ctl-md resize-none px-3 py-[9px] leading-6 no-scrollbar lg:py-[7px]",
    },
  },
  defaultVariants: { size: "default" },
})

type TextareaProps = Omit<React.ComponentProps<"textarea">, "size"> &
  VariantProps<typeof textareaVariants>

function Textarea({ className, size, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldVariants({ size: null }), textareaVariants({ size }), className)}
      {...props}
    />
  )
}

export { Input, Textarea, fieldVariants }
