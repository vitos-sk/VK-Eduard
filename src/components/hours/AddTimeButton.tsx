"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

/** Единственное действие над временем: открыть форму ручного ввода. Таймера смены в приложении нет. */
export function AddTimeButton({ className, compact }: { className?: string; compact?: boolean }) {
  const t = useT();

  return (
    <Button asChild block={!compact} size={compact ? "sm" : undefined} className={className}>
      <Link href="/time/manual">
        <Plus className={compact ? "size-4 shrink-0" : "size-[18px] shrink-0"} strokeWidth={compact ? 2 : 1.9} aria-hidden />
        {t.hours.addManually}
      </Link>
    </Button>
  );
}
