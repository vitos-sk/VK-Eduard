"use client";

import { useActionState } from "react";

import { t } from "@/lib/i18n";
import { updateFullName } from "@/modules/auth/actions";
import { cn } from "@/lib/utils";

export function EditNameForm({ fullName }: { fullName: string }) {
  const [state, formAction, isPending] = useActionState(updateFullName, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-4 px-4 lg:mx-auto lg:max-w-[480px]">
      <div>
        <p className="mb-2 text-[13px] font-semibold text-text-muted">
          {t.profile.nameLabel}
        </p>
        <input
          name="fullName"
          defaultValue={fullName}
          placeholder={t.profile.namePlaceholder}
          className={cn(
            "h-[52px] w-full rounded-[14px] border border-border bg-surface px-3",
            "text-[15px] font-bold text-text placeholder:text-text-dim outline-none",
            "focus-visible:border-brand",
          )}
        />
      </div>

      {state.error && (
        <p className="text-[13px] font-semibold text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "mt-2 flex h-[56px] w-full items-center justify-center rounded-[14px]",
          "bg-brand text-[15px] font-bold text-brand-ink",
          "transition-transform duration-150 active:scale-[0.98]",
          "disabled:pointer-events-none disabled:opacity-60",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        )}
      >
        {t.profile.save}
      </button>
    </form>
  );
}
