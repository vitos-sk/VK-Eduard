"use client";

import { useState, useTransition } from "react";
import { Check, Copy, UserPlus, X } from "lucide-react";

import {
  SegmentedTabs,
  type SegmentedOption,
} from "@/components/shared/SegmentedTabs";
import { t } from "@/lib/i18n";
import { createWorker } from "@/modules/team/actions";
import { cn } from "@/lib/utils";

type Role = "worker" | "boss";

const ROLE_OPTIONS: readonly SegmentedOption<Role>[] = [
  { value: "worker", label: t.reports.team.form.roleWorker },
  { value: "boss", label: t.reports.team.form.roleBoss },
];

const inputClassName = cn(
  "h-[52px] w-full rounded-[14px] border border-border bg-surface px-3",
  "text-[15px] font-bold text-text placeholder:text-text-dim outline-none",
  "focus-visible:border-brand",
);

interface AddWorkerFormProps {
  onClose: () => void;
  /** Работника нужно перечитать из базы — вызывается сразу после успеха. */
  onCreated: () => void;
  className?: string;
}

/**
 * Форма «Додати співробітника» на вкладці «Команда» (тільки boss).
 * Два кроки в одному компоненті: спершу поля, потім — один раз показаний
 * тимчасовий пароль, який шеф передає людині сам (запрошень поштою нема).
 */
export function AddWorkerForm({ onClose, onCreated, className }: AddWorkerFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("worker");

  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const isValid = fullName.trim() !== "" && email.trim() !== "";

  const handleSubmit = () => {
    setError(null);

    startTransition(async () => {
      const state = await createWorker({ fullName, email, role });

      if (state.error !== null) {
        setError(state.error);
        return;
      }

      setResult({ email: state.email, tempPassword: state.tempPassword });
      onCreated();
    });
  };

  const handleCopy = () => {
    if (!result) return;

    navigator.clipboard
      .writeText(`${result.email} / ${result.tempPassword}`)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(() => {});
  };

  if (result) {
    return (
      <div className={cn("rounded-[16px] border border-border bg-surface p-4", className)}>
        <p className="text-[16px] font-bold">{t.reports.team.form.createdTitle}</p>

        <dl className="mt-3 flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[13px] font-medium text-text-muted">
              {t.reports.team.form.emailLabel}
            </dt>
            <dd className="tabular text-[14px] font-bold">{result.email}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[13px] font-medium text-text-muted">
              {t.reports.team.form.tempPasswordLabel}
            </dt>
            <dd className="tabular text-[16px] font-bold">{result.tempPassword}</dd>
          </div>
        </dl>

        <p className="mt-3 text-[13px] leading-[1.4] font-medium text-text-muted">
          {t.reports.team.form.tempPasswordHint}
        </p>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px]",
              "border border-border text-[15px] font-bold text-text",
              "transition-transform duration-150 active:scale-[0.98]",
            )}
          >
            {isCopied ? (
              <Check className="size-[18px]" strokeWidth={2} aria-hidden />
            ) : (
              <Copy className="size-[18px]" strokeWidth={2} aria-hidden />
            )}
            {isCopied ? t.reports.team.form.copied : t.reports.team.form.copy}
          </button>

          <button
            type="button"
            onClick={onClose}
            className={cn(
              "flex h-12 flex-1 items-center justify-center rounded-[14px]",
              "bg-brand text-[15px] font-bold text-brand-ink",
              "transition-transform duration-150 active:scale-[0.98]",
            )}
          >
            {t.reports.team.form.close}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-[16px] border border-border bg-surface p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[16px] font-bold">
          <UserPlus className="size-5 text-brand" strokeWidth={2} aria-hidden />
          {t.reports.team.form.title}
        </p>

        <button
          type="button"
          onClick={onClose}
          aria-label={t.reports.team.form.cancel}
          className="flex size-9 items-center justify-center rounded-full text-text-muted active:bg-surface-2"
        >
          <X className="size-5" strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder={t.reports.team.form.namePlaceholder}
          aria-label={t.reports.team.form.nameLabel}
          className={inputClassName}
        />

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t.reports.team.form.emailPlaceholder}
          aria-label={t.reports.team.form.emailLabel}
          className={inputClassName}
        />

        <SegmentedTabs
          options={ROLE_OPTIONS}
          value={role}
          onChange={setRole}
          label={t.reports.team.form.roleLabel}
        />

        {error && <p className="text-[13px] font-semibold text-danger">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || isPending}
          className={cn(
            "flex h-[52px] w-full items-center justify-center rounded-[14px]",
            "bg-brand text-[15px] font-bold text-brand-ink",
            "transition-transform duration-150 active:scale-[0.98]",
            "disabled:pointer-events-none disabled:opacity-60",
          )}
        >
          {t.reports.team.form.save}
        </button>
      </div>
    </div>
  );
}
