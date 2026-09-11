"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/BottomNav";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { PhoneFrame } from "@/components/layout/PhoneFrame";
import { QuickActionSheet } from "@/components/quick/QuickActionSheet";
import { Toaster } from "@/components/ui/sonner";
import type { Profile } from "@/modules/auth/session";

interface AppShellProps {
  profile: Profile;
  children: ReactNode;
}

/**
 * Оболочка четырёх вкладок.
 *
 * До `lg` (1024px) — телефон-контейнер со скроллящимся контентом и
 * таб-баром поверх него, как и раньше, без изменений.
 *
 * От `lg` и шире — параллельная десктопная ветка: сайдбар слева
 * (`DesktopSidebar`) + контент по центру, без рамки телефона.
 *
 * Обе ветки смонтированы одновременно (переключаются классами
 * `lg:hidden`/`hidden lg:flex`), поэтому состояние листа быстрых действий
 * держим здесь один раз — общее и для таб-бара, и для сайдбара.
 */
export function AppShell({ profile, children }: AppShellProps) {
  const [isQuickOpen, setIsQuickOpen] = useState(false);

  return (
    <>
      {/* Мобильная ветка — без изменений */}
      <div className="lg:hidden">
        <PhoneFrame>
          {/* pb-[92px]: 68px бар + 24px воздуха, чтобы контент не заезжал под него */}
          <div className="h-full overflow-y-auto overscroll-contain pb-[92px]">
            {children}
          </div>

          <BottomNav
            onFabClick={() => setIsQuickOpen((open) => !open)}
            fabExpanded={isQuickOpen}
          />
        </PhoneFrame>
      </div>

      {/* Desktop-ветка */}
      <div className="hidden min-h-dvh bg-bg text-text lg:flex">
        <DesktopSidebar
          profile={profile}
          onFabClick={() => setIsQuickOpen((open) => !open)}
        />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1200px] px-8 py-8">{children}</div>
        </main>
      </div>

      <QuickActionSheet open={isQuickOpen} onOpenChange={setIsQuickOpen} />

      <Toaster position="top-center" />
    </>
  );
}
