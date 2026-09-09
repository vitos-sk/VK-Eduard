import Link from "next/link";
import { Camera, Clock, Database, FileText, PlusCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { InstallHint } from "@/components/welcome/InstallHint";
import { t } from "@/lib/i18n";

/**
 * Пять возможностей приложения. Порядок как на макете:
 * от того, что делают каждый день, к тому, что нужно шефу.
 */
const features: { icon: LucideIcon; label: string }[] = [
  { icon: Clock, label: t.welcome.features.hours },
  { icon: FileText, label: t.welcome.features.description },
  { icon: Camera, label: t.welcome.features.photos },
  { icon: PlusCircle, label: t.welcome.features.overtime },
  { icon: Database, label: t.welcome.features.database },
];

/**
 * Стартовый экран для тех, кто ещё не вошёл.
 *
 * Единственный статичный экран приложения, поэтому рендерится на сервере.
 * Кнопка ведёт на вход; пока экрана входа нет — на главную.
 */
export function WelcomeScreen() {
  return (
    <div className="flex min-h-full flex-col px-6 pt-[calc(env(safe-area-inset-top)+3rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <Logo size={30} />

      <h1 className="mt-10 text-[40px]/[1.05] font-extrabold tracking-[-0.02em]">
        {t.welcome.titleLine1}
        <br />
        {t.welcome.titleLine2}
        <br />
        {t.welcome.titleLine3}
      </h1>

      <ul className="mt-9 flex flex-col gap-5">
        {features.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-4">
            <span
              aria-hidden
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-text"
            >
              <Icon className="size-[22px]" strokeWidth={2} />
            </span>
            <span className="text-[17px] font-semibold">{label}</span>
          </li>
        ))}
      </ul>

      {/* Отступ фиксированный, как на макете: кнопка идёт сразу за списком, а не прижимается к низу экрана */}
      <div className="mt-12 pb-2">
        <Link
          href="/login"
          className="flex h-14 w-full items-center justify-center rounded-[14px] bg-brand text-[17px] font-bold text-brand-ink transition-transform duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {t.welcome.start}
        </Link>

        <InstallHint />
      </div>
    </div>
  );
}
