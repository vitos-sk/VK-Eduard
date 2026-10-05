"use client";

import { useState, useTransition } from "react";
import { UserPlus, X } from "lucide-react";

import {
  SegmentedTabs,
  type SegmentedOption,
} from "@/components/shared/SegmentedTabs";
import { useT } from "@/lib/i18n/client";
import { createWorker } from "@/modules/team/actions";
import { Ticket } from "@/components/ui/ticket";
import { Button } from "@/components/ui/button";
import { UnderlineField } from "@/components/ui/underline-field";

type Role = "worker" | "boss";

interface AddWorkerFormProps {
  onClose: () => void;
  /** Работника нужно перечитать из базы — вызывается сразу после успеха. */
  onCreated: () => void;
  className?: string;
}

/**
 * Форма «Додати співробітника» на вкладці «Команда» (тільки boss).
 * Пароль задає сам шеф (поле нижче) — запрошень поштою нема, тож саме
 * він і передає ці дані людині.
 */
export function AddWorkerForm({ onClose, onCreated, className }: AddWorkerFormProps) {
  const t = useT();
  const ROLE_OPTIONS: readonly SegmentedOption<Role>[] = [
    { value: "worker", label: t.reports.team.form.roleWorker },
    { value: "boss", label: t.reports.team.form.roleBoss },
  ];
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("worker");

  const [result, setResult] = useState<{ email: string } | null>(null);

  const isValid = fullName.trim() !== "" && email.trim() !== "" && password.length >= 6;

  const handleSubmit = () => {
    setError(null);

    startTransition(async () => {
      const state = await createWorker({ fullName, email, password, role });

      if (state.error !== null) {
        setError(state.error);
        return;
      }

      setResult({ email: state.email });
      onCreated();
    });
  };

  if (result) {
    return (
      <Ticket variant="flat" className={className}>
        <p className="text-[15px] font-semibold">{t.reports.team.form.createdTitle}</p>

        <dl className="mt-3 flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[13px] text-ink-2">
              {t.reports.team.form.emailLabel}
            </dt>
            <dd className="tabular text-[14px] font-semibold">{result.email}</dd>
          </div>
        </dl>

        <p className="mt-3 text-[13px] leading-[1.4] text-ink-2">
          {t.reports.team.form.createdHint}
        </p>

        <div className="mt-4 flex gap-3">
          <Button className="flex-1" onClick={onClose}>
            {t.reports.team.form.close}
          </Button>
        </div>
      </Ticket>
    );
  }

  return (
    <Ticket variant="flat" className={className}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[15px] font-semibold">
          <UserPlus className="size-5 text-primary" strokeWidth={1.9} aria-hidden />
          {t.reports.team.form.title}
        </p>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label={t.reports.team.form.cancel}
        >
          <X className="size-5" strokeWidth={1.9} aria-hidden />
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <UnderlineField
          label={t.reports.team.form.nameLabel}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder={t.reports.team.form.namePlaceholder}
        />

        <UnderlineField
          type="email"
          label={t.reports.team.form.emailLabel}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t.reports.team.form.emailPlaceholder}
        />

        <UnderlineField
          type="password"
          label={t.reports.team.form.passwordLabel}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t.reports.team.form.passwordPlaceholder}
          autoComplete="new-password"
        />

        <SegmentedTabs
          className="mt-1"
          options={ROLE_OPTIONS}
          value={role}
          onChange={setRole}
          label={t.reports.team.form.roleLabel}
        />

        {error && <p className="text-[13px] text-err">{error}</p>}

        <Button block onClick={handleSubmit} disabled={!isValid || isPending}>
          {t.reports.team.form.save}
        </Button>
      </div>
    </Ticket>
  );
}
