"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { UnderlineField } from "@/components/ui/underline-field";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { requestPasswordReset, type ForgotPasswordState } from "@/modules/auth/actions";

const initialState: ForgotPasswordState = { status: "idle", error: null };

/** «Забули пароль?»: email → письмо со ссылкой. После отправки форма заменяется подтверждением. */
export function ForgotPasswordForm({ linkInvalid = false }: { linkInvalid?: boolean }) {
  const t = useT();
  const [state, formAction] = useActionState(requestPasswordReset, initialState);
  const error = state.error ?? (linkInvalid && state.status === "idle" ? t.auth.linkInvalid : null);

  return (
    <div className="flex min-h-full flex-col px-4 pt-[calc(env(safe-area-inset-top)+3rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <Logo size={30} />

      <h1 className="mt-10 text-[24px]/[1.15] font-semibold tracking-[-0.02em]">{t.auth.forgotTitle}</h1>

      {state.status === "sent" ? (
        <>
          <p aria-live="polite" className="mt-3 text-[15px] leading-relaxed text-ink-2">
            {t.auth.forgotSent}
          </p>
          <Button asChild variant="outline" block className="mt-6">
            <Link href="/login">{t.auth.backToLogin}</Link>
          </Button>
        </>
      ) : (
        <form action={formAction} className="flex flex-col">
          <p className="mt-1 text-[13px] text-ink-2">{t.auth.forgotSubtitle}</p>

          <div className="mt-6">
            <UnderlineField
              name="email"
              type="email"
              label={t.auth.email}
              placeholder={t.auth.emailPlaceholder}
              autoComplete="email"
              inputMode="email"
              required
            />
          </div>

          <p aria-live="polite" className={cn("mt-4 min-h-[20px] text-[13px] text-err", !error && "sr-only")}>
            {error}
          </p>

          <SubmitButton />

          <Link href="/login" className="mt-4 text-center text-[14px] font-medium text-primary">
            {t.auth.backToLogin}
          </Link>
        </form>
      )}
    </div>
  );
}

function SubmitButton() {
  const t = useT();
  const { pending } = useFormStatus();

  return (
    <Button block className="mt-6" type="submit" loading={pending}>
      {pending ? t.auth.forgotSubmitting : t.auth.forgotSubmit}
    </Button>
  );
}
