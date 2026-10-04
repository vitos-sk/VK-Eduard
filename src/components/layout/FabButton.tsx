"use client";

import { Plus } from "lucide-react";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface FabButtonProps {
  onClick: () => void;
  /** Открыт ли лист быстрых действий — влияет на поворот плюса и `aria-expanded`. */
  expanded?: boolean;
  className?: string;
}

/**
 * Fab: круг 44 px, зелёный, белый плюс 20 px, без тени. Только на таб-баре.
 * Зона нажатия 44 px — размер самого круга.
 */
export function FabButton({ onClick, expanded = false, className }: FabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t.nav.add}
      aria-expanded={expanded}
      className={cn(
        "grid size-11 place-items-center rounded-full bg-primary text-on-primary transition-colors outline-none hover:bg-primary-hover active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <Plus
        className={cn("size-5 transition-transform duration-200", expanded && "rotate-45")}
        strokeWidth={1.9}
        aria-hidden
      />
    </button>
  );
}
