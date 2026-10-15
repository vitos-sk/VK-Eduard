"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

/**
 * Что-то сломалось при открытии страницы (база не ответила, нет связи): понятное сообщение и две кнопки
 * вместо сырого текста ошибки.
 */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+3rem)] pb-6 lg:mx-auto lg:max-w-[480px] lg:px-0 lg:pt-12">
      <EmptyState
        icon={TriangleAlert}
        title={t.errorPages.errorTitle}
        description={t.errorPages.errorHint}
        action={
          <div className="flex gap-2">
            <Button onClick={reset}>{t.errorPages.retry}</Button>
            <Button asChild variant="outline">
              <Link href="/">{t.errorPages.goHome}</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
