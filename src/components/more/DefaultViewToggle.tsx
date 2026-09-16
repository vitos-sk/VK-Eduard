"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { t } from "@/lib/i18n";
import { updateDefaultView } from "@/modules/auth/actions";
import type { Profile } from "@/modules/auth/profile";

type DefaultView = "app" | "admin";

interface DefaultViewToggleProps {
  profile: Profile;
}

/**
 * Перемикач «що відкривати одразу після входу» — тільки для `boss`, живе
 * на `/more/admin`. Оптимістично оновлює локальний стан, відкатує назад,
 * якщо збереження впало (немає мережі тощо).
 */
export function DefaultViewToggle({ profile }: DefaultViewToggleProps) {
  const [value, setValue] = useState<DefaultView>(profile.default_view as DefaultView);
  const [, startTransition] = useTransition();

  const handleChange = (next: DefaultView) => {
    const previous = value;
    setValue(next);

    startTransition(async () => {
      const result = await updateDefaultView(next);

      if (result.error) {
        setValue(previous);
        toast(result.error);
      }
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-surface-2 p-3">
      <p className="text-[14px] font-bold">{t.admin.panel.defaultViewLabel}</p>
      <SegmentedTabs
        size="sm"
        label={t.admin.panel.defaultViewLabel}
        className="mx-0 w-auto min-w-0 px-0"
        options={[
          { value: "app" as const, label: t.admin.panel.defaultViewApp },
          { value: "admin" as const, label: t.admin.panel.defaultViewAdmin },
        ]}
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}
