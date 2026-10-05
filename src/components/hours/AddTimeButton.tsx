"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

/** Единственное действие над временем: открыть форму ручного ввода. Таймера смены в приложении нет. */
export function AddTimeButton({ className }: { className?: string }) {
  const t = useT();

  return (
    <Button asChild block className={className}>
      <Link href="/time/manual">
        <Plus className="size-[18px] shrink-0" strokeWidth={1.9} aria-hidden />
        {t.hours.addManually}
      </Link>
    </Button>
  );
}
