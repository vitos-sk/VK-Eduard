"use client";

import Link from "next/link";
import { Camera, Clock, Database, FileText, PlusCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { InstallHint } from "@/components/welcome/InstallHint";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";

/**
 * Стартовый экран для тех, кто ещё не вошёл.
 *
 * Кнопка ведёт на вход; пока экрана входа нет — на главную.
 */
export function WelcomeScreen() {
  const t = useT();
  const features: { icon: LucideIcon; label: string }[] = [
    { icon: Clock, label: t.welcome.features.hours },
    { icon: FileText, label: t.welcome.features.description },
    { icon: Camera, label: t.welcome.features.photos },
    { icon: PlusCircle, label: t.welcome.features.overtime },
    { icon: Database, label: t.welcome.features.database },
  ];
  return (
    <div className="flex min-h-full flex-col px-4 pt-[calc(env(safe-area-inset-top)+3rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <Logo size={30} />

      <h1 className="mt-10 text-[36px]/[1.05] font-semibold tracking-[-0.02em]">
        {t.welcome.titleLine1}
        <br />
        {t.welcome.titleLine2}
        <br />
        {t.welcome.titleLine3}
      </h1>

      <ul className="mt-8 flex flex-col">
        {features.map(({ icon: Icon, label }) => (
          <li key={label} className="perf-b flex items-center gap-4 py-3 first:border-t first:border-dashed first:border-perf">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-md border border-edge bg-stub text-primary"
            >
              <Icon className="size-[22px]" strokeWidth={1.9} />
            </span>
            <span className="text-[15px] font-medium">{label}</span>
          </li>
        ))}
      </ul>

      {/* Отступ фиксированный, как на макете: кнопка идёт сразу за списком, а не прижимается к низу экрана */}
      <div className="mt-10 pb-2">
        <Button asChild block>
          <Link href="/login">{t.welcome.start}</Link>
        </Button>

        <InstallHint />
      </div>
    </div>
  );
}
