"use client";

import { Plus } from "lucide-react";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
    <Button
      variant="accent"
      size="icon-lg"
      // Метка для листа быстрых действий: клик по FAB не должен закрываться
      // как «клик вне листа» — кнопка сама переключает состояние.
      data-quick-fab=""
      onClick={onClick}
      aria-label={t.nav.add}
      aria-expanded={expanded}
      className={cn("active:scale-95", className)}
    >
      <Plus
        className={cn(
          "size-7 transition-transform duration-200",
          expanded && "rotate-45",
        )}
        strokeWidth={2.5}
        aria-hidden
      />
    </Button>
  );
}
