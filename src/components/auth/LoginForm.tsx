"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Logo } from "@/components/brand/Logo";
import { signIn, type SignInState } from "@/modules/auth/actions";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: SignInState = { error: null };

/**
 * Единственная форма входа. Пароль восстанавливать пока негде —
 * забывшему его меняет шеф.
 */
export function LoginForm() {
  const [state, formAction] = useActionState(signIn, initialState);

  return (
    <form
      action={formAction}
      className="flex min-h-full flex-col px-6 pt-[calc(env(safe-area-inset-top)+3rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
    >
      <Logo size={30} />

      <h1 className="mt-10 text-[32px]/[1.1] font-extrabold tracking-[-0.02em]">
        {t.auth.title}
      </h1>
      <p className="mt-2 text-[15px] font-medium text-text-muted">
        {t.auth.subtitle}
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <Field
          name="email"
          type="email"
          label={t.auth.email}
          placeholder={t.auth.emailPlaceholder}
          autoComplete="email"
          inputMode="email"
        />
        <Field
          name="password"
          type="password"
          label={t.auth.password}
          placeholder={t.auth.passwordPlaceholder}
          autoComplete="current-password"
        />
      </div>

      {/* aria-live: ошибку после отправки должен услышать и скринридер */}
      <p
        aria-live="polite"
        className={cn(
          "mt-4 min-h-[20px] text-[14px] font-semibold text-danger-fg",
          !state.error && "sr-only",
        )}
      >
        {state.error}
      </p>

      <SubmitButton />
    </form>
  );
}

function Field({
  name,
  label,
  ...input
}: { name: string; label: string } & React.ComponentProps<"input">) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-bold tracking-wide text-text-muted uppercase">
        {label}
      </span>
      <Input
        {...input}
        name={name}
        required
        size="lg"
      />
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button size="xl" block className="mt-6" type="submit" disabled={pending}>
      {pending ? t.auth.submitting : t.auth.submit}
    </Button>
  );
}
