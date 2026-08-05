"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/BottomNav";
import { PhoneFrame } from "@/components/layout/PhoneFrame";

/**
 * Оболочка четырёх вкладок: телефон-контейнер, скроллящийся контент
 * и таб-бар поверх него.
 *
 * Здесь же живёт состояние листа быстрых действий — сам лист
 * подключается на шаге 10, пока FAB только переключает флаг.
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
    </PhoneFrame>
  );
}
