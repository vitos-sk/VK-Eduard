"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/BottomNav";
import { PhoneFrame } from "@/components/layout/PhoneFrame";
import { QuickActionSheet } from "@/components/quick/QuickActionSheet";
import { Toaster } from "@/components/ui/sonner";

/**
 * Оболочка четырёх вкладок: телефон-контейнер, скроллящийся контент,
 * таб-бар поверх него и лист быстрых действий по кнопке «+».
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const [isQuickOpen, setIsQuickOpen] = useState(false);

  return (
    <PhoneFrame>
      {/* pb-[92px]: 68px бар + 24px воздуха, чтобы контент не заезжал под него */}
      <div className="h-full overflow-y-auto overscroll-contain pb-[92px]">
        {children}
      </div>

      <BottomNav
        onFabClick={() => setIsQuickOpen((open) => !open)}
        fabExpanded={isQuickOpen}
      />

      <QuickActionSheet open={isQuickOpen} onOpenChange={setIsQuickOpen} />

      <Toaster position="top-center" />
    </PhoneFrame>
  );
}
