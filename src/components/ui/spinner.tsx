import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      role="status"
      aria-label="Завантаження"
      data-slot="spinner"
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-[spin_2s_linear_infinite]",
        className
      )}
      {...props}
    />
  )
}

export { Spinner }
