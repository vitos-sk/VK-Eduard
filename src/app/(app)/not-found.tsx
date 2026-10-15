import Link from "next/link";
import { SearchX } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";

/**
 * «Не найдено» внутри приложения (нижняя панель остаётся): удалённый чеклист, чужой чат, устаревшая ссылка.
 * Вместо серой страницы Next.js человек видит понятную подсказку и кнопку на главную.
 */
export default async function NotFound() {
  const t = await getT();

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+3rem)] pb-6 lg:mx-auto lg:max-w-[480px] lg:px-0 lg:pt-12">
      <EmptyState
        icon={SearchX}
        title={t.errorPages.notFoundTitle}
        description={t.errorPages.notFoundHint}
        action={
          <Button asChild>
            <Link href="/">{t.errorPages.goHome}</Link>
          </Button>
        }
      />
    </div>
  );
}
