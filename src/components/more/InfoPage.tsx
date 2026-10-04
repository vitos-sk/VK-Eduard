import type { ReactNode } from "react";

import { BackHeader } from "@/components/layout/ScreenHeader";

interface InfoPageProps {
  title: string;
  children: ReactNode;
}

/** Простая подстраница «Налаштувань»: заголовок назад + текстовый блок. */
export function InfoPage({ title, children }: InfoPageProps) {
  return (
    <div className="pb-6">
      <BackHeader title={title} href="/more" />

      <div className="flex flex-col gap-4 px-4 text-[15px] leading-relaxed text-ink-2 lg:mx-auto lg:max-w-[480px] lg:px-0">
        {children}
      </div>
    </div>
  );
}
