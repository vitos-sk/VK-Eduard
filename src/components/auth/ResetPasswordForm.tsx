"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { UnderlineField } from "@/components/ui/underline-field";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { updatePassword, type ResetPasswordState } from "@/modules/auth/actions";

const initialState: ResetPasswordState = { error: null };

/** Новый пароль: два поля — сам пароль и повтор. Открывается по ссылке из письма (сессия уже есть). */
export function ResetPasswordForm() {
  const t = useT();
  const [state, formAction] = useActionState(updatePassword, initialState);

  return (
    <form
      action={formAction}
      className="flex min-h-full flex-col px-4 pt-[calc(env(safe-area-inset-top)+3rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
    >
      <Logo size={30} />

      <h1 className="mt-10 text-[24px]/[1.15] font-semibold tracking-[-0.02em]">{t.auth.resetTitle}</h1>
      <p className="mt-1 text-[13px] text-ink-2">{t.auth.resetSubtitle}</p>

      <div className="mt-6 flex flex-col gap-4">
        <UnderlineField
          name="password"
          type="password"
          label={t.auth.newPassword}
          placeholder={t.reports.team.form.passwordPlaceholder}
          autoComplete="new-password"
          minLength={6}
          required
        />
        <UnderlineField
          name="confirm"
          type="password"
          label={t.auth.confirmPassword}
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>

      <p aria-live="polite" className={cn("mt-4 min-h-[20px] text-[13px] text-err", !state.error && "sr-only")}>
        {state.error}
      </p>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const t = useT();
  const { pending } = useFormStatus();

  return (
    <Button block className="mt-6" type="submit" loading={pending}>
      {pending ? t.auth.resetSubmitting : t.auth.resetSubmit}
    </Button>
  );
}
