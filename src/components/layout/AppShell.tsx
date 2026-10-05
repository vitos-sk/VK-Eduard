"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/BottomNav";
import { OfflineSync } from "@/components/layout/OfflineSync";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import { SyncBanner } from "@/components/layout/SyncBanner";
import { OwnAvatarProvider } from "@/components/layout/OwnAvatar";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { PhoneFrame } from "@/components/layout/PhoneFrame";
import { QuickActionSheet } from "@/components/quick/QuickActionSheet";
import { Toaster } from "@/components/ui/sonner";
import type { Profile } from "@/modules/auth/profile";

interface AppShellProps {
  profile: Profile;
  /** Подписанная ссылка на своё фото. */
  avatarUrl: string | null;
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
export function AppShell({ profile, avatarUrl, children }: AppShellProps) {
  const [isQuickOpen, setIsQuickOpen] = useState(false);

  return (
    <OwnAvatarProvider url={avatarUrl}>
      {/* Телефон и планшет */}
      <div className="lg:hidden">
        <PhoneFrame>
          {/* Бар — flex-элемент под скроллом, а не absolute: он всегда у низа
              фрейма, даже когда iOS меняет высоту вьюпорта. pb-6 — воздух под FAB. */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6">
            <SyncBanner userId={profile.id} />
            {children}
          </div>

          <BottomNav
            onFabClick={() => setIsQuickOpen((open) => !open)}
            fabExpanded={isQuickOpen}
          />

          {/* Меню «+» внутри колонки: выезжает из таб-бара */}
          <QuickActionSheet
            open={isQuickOpen}
            onOpenChange={setIsQuickOpen}
            isBoss={profile.role === "boss"}
          />
        </PhoneFrame>
      </div>

      {/* Desktop-ветка: h-dvh (не min-h-dvh) — контейнер не растягивается
          вместе с контентом, поэтому скроллится только `main`, а сайдбар
          остаётся статичным по высоте вьюпорта. */}
      <div className="hidden h-dvh bg-paper text-text lg:flex">
        <DesktopSidebar profile={profile} />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <SyncBanner userId={profile.id} />
          <div className="mx-auto max-w-[1240px] px-6 py-6">{children}</div>
        </main>
      </div>

      <OfflineSync userId={profile.id} />
      <ServiceWorkerRegister />
      <Toaster position="bottom-center" />
    </OwnAvatarProvider>
  );
}
