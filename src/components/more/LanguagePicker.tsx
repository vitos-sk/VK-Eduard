"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Radio, RadioGroup } from "@/components/ui/radio";
import { Ticket } from "@/components/ui/ticket";
import { setLocale } from "@/lib/i18n/actions";
import { useLocale, useT } from "@/lib/i18n/client";
import { LOCALE_NAMES, LOCALES } from "@/lib/i18n/locales";

/**
 * Список языков. Выбор сразу уходит в куку на устройстве (`setLocale`),
 * после чего страница перерисовывается на новом языке.
 */
export function LanguagePicker() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [selected, setSelected] = useState<string>(locale);
  const [, startTransition] = useTransition();

  function choose(next: string) {
    if (next === selected) return;

    setSelected(next);
    startTransition(async () => {
      const result = await setLocale(next);

      if (!result.ok) {
        setSelected(locale);
        toast.error(t.profile.languagePage.saveError);
        return;
      }

      router.refresh();
    });
  }

  return (
    <Ticket variant="sections">
      <RadioGroup
        value={selected}
        onValueChange={choose}
        aria-label={t.profile.languagePage.title}
        className="gap-0"
      >
        {LOCALES.map((code) => (
          <label
            key={code}
            className="flex min-h-12 cursor-pointer items-center gap-3 px-3.5 not-first:border-t not-first:border-dashed not-first:border-perf hover:bg-primary-tint"
          >
            <span className="flex-1 text-[14px] font-medium text-text">{LOCALE_NAMES[code]}</span>
            <Radio value={code} />
          </label>
        ))}
      </RadioGroup>
    </Ticket>
  );
}
