"use client";

import { useActionState } from "react";

import { useT } from "@/lib/i18n/client";
import { updateFullName } from "@/modules/auth/actions";
import { NetworkButton } from "@/components/ui/network-button";
import { Ticket } from "@/components/ui/ticket";
import { UnderlineField } from "@/components/ui/underline-field";

export function EditNameForm({ fullName }: { fullName: string }) {
  const t = useT();
  const [state, formAction, isPending] = useActionState(updateFullName, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-3.5 px-4 lg:mx-auto lg:max-w-[480px] lg:px-0">
      <Ticket variant="flat">
        <UnderlineField
          label={t.profile.nameLabel}
          name="fullName"
          defaultValue={fullName}
          placeholder={t.profile.namePlaceholder}
          error={state.error ?? undefined}
        />
      </Ticket>

      <NetworkButton block type="submit" loading={isPending}>
        {t.profile.save}
      </NetworkButton>
    </form>
  );
}
