"use client";

import { useActionState } from "react";

import { t } from "@/lib/i18n";
import { updateFullName } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EditNameForm({ fullName }: { fullName: string }) {
  const [state, formAction, isPending] = useActionState(updateFullName, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-4 px-4 lg:mx-auto lg:max-w-[480px]">
      <div>
        <p className="mb-2 text-[13px] font-semibold text-text-muted">
          {t.profile.nameLabel}
        </p>
        <Input
          name="fullName"
          defaultValue={fullName}
          placeholder={t.profile.namePlaceholder}
        />
      </div>

      {state.error && (
        <p className="text-[13px] font-semibold text-danger-fg">{state.error}</p>
      )}

      <Button size="xl" block className="mt-2" type="submit" disabled={isPending}>
        {t.profile.save}
      </Button>
    </form>
  );
}
