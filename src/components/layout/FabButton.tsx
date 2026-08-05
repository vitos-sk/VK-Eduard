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
 * Круглая жёлтая кнопка «+» в центре таб-бара.
 * Диаметр 60px, приподнята над баром на 18px, с лёгким свечением.
 */
export function FabButton({ onClick, expanded = false, className }: FabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t.nav.add}
      aria-expanded={expanded}
      className={cn(
        "flex size-[60px] items-center justify-center rounded-full bg-brand text-brand-ink",
        "shadow-[0_6px_20px_-4px_rgba(255,201,60,0.45)]",
        "transition-transform duration-200 active:scale-95",
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand",
        className,
      )}
    >
      <Plus
        className={cn(
          "size-7 transition-transform duration-200",
          expanded && "rotate-45",
        )}
        strokeWidth={2.5}
        aria-hidden
      />
    </button>
  );
}
