"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Logo } from "@/components/brand/Logo";
import { signIn, type SignInState } from "@/modules/auth/actions";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
          "mt-4 min-h-[20px] text-[14px] font-semibold text-danger",
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
      <input
        {...input}
        name={name}
        required
        // 16px и больше — иначе iOS зумит страницу при фокусе в поле
        className={cn(
          "h-14 rounded-[14px] border border-border bg-surface-2 px-4",
          "text-[16px] font-semibold text-text placeholder:text-text-muted",
          "focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
        )}
      />
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "mt-6 flex h-14 w-full items-center justify-center rounded-[14px]",
        "bg-brand text-[17px] font-bold text-brand-ink",
        "transition-transform duration-150 active:scale-[0.98]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        "disabled:opacity-60",
      )}
    >
      {pending ? t.auth.submitting : t.auth.submit}
    </button>
  );
}
